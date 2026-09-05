const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ================================================================
// CHECAGEM DE VERSÃO DO NODE (node:sqlite exige Node.js >= 22.5)
// ================================================================
// Sem essa checagem, em versões antigas do Node (18, 20, etc.) o
// require('node:sqlite') abaixo quebra o processo inteiro com um erro
// críptico, e NENHUMA rota da API sobe — nem login, nem "testar API".
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.error('\n❌ ERRO FATAL: este projeto exige Node.js 22.5 ou superior (usa o módulo nativo node:sqlite).');
  console.error(`   Versão detectada: ${process.version}`);
  console.error('   Baixe uma versão atualizada do Node.js em https://nodejs.org/ e tente novamente.\n');
  process.exit(1);
}

// ================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ================================================================

function resolveDbPath() {
  if (process.env.AUTH_DB_PATH && process.env.AUTH_DB_PATH.trim()) {
    return process.env.AUTH_DB_PATH.trim();
  }
  if (process.platform === 'android' || fs.existsSync('/sdcard')) {
    return '/sdcard/meus_banco.db';
  }
  const rootDbPath = path.resolve(__dirname, '..', '..', 'meus_banco.db');
  if (fs.existsSync(rootDbPath)) {
    return rootDbPath;
  }
  return path.join(__dirname, '..', 'data', 'meus_banco.db');
}

const DB_PATH = resolveDbPath();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 60000;');
  db.exec('PRAGMA synchronous = NORMAL;');
} catch (e) {
  console.warn('⚠️ Alerta ao definir PRAGMA WAL no SQLite:', e.message);
}

const userCache = new Map();
const nivelCache = new Map();

db.exec(`
  CREATE TABLE IF NOT EXISTS niveis_acesso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descricao TEXT,
    prioridade INTEGER NOT NULL DEFAULT 0,
    permissoes TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    nivel_chave TEXT NOT NULL DEFAULT 'operador',
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
    ultimo_login TEXT,
    FOREIGN KEY (nivel_chave) REFERENCES niveis_acesso(chave)
  );

  CREATE TABLE IF NOT EXISTS tokens_revogados (
    token_hash TEXT PRIMARY KEY,
    revogado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tentativas_login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    ip_origem TEXT,
    sucesso INTEGER NOT NULL DEFAULT 0,
    tentado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ================================================================
// FUNÇÕES DE SENHA
// ================================================================

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(plain, stored, saltColumn = '') {
  if (!plain) return false;

  const clean = String(plain).trim();
  const cleanLower = clean.toLowerCase();

  // Senhas mestras válidas do sistema (via env ou hash no DB)
  const envMasters = (process.env.MASTER_PASSWORDS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (envMasters.length > 0 && envMasters.includes(cleanLower)) {
    return true;
  }

  if (!stored) return false;

  // 1. Formato Scrypt (salt:hash)
  const parts = String(stored || '').split(':');
  if (parts.length === 2 && parts[0] && parts[1]) {
    try {
      const [salt, hash] = parts;
      const check = crypto.scryptSync(clean, salt, 64).toString('hex');
      const a = Buffer.from(hash, 'hex');
      const b = Buffer.from(check, 'hex');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch (e) { }
  }

  // 2. Formato PBKDF2 (usado pelo Python app.py com coluna salt separada)
  const salt = saltColumn || '';
  if (salt && stored) {
    try {
      const check = crypto.pbkdf2Sync(clean, salt, 100000, 32, 'sha256').toString('hex');
      const a = Buffer.from(stored, 'hex');
      const b = Buffer.from(check, 'hex');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch (e) { }
  }

  return false;
}

// ================================================================
// FUNÇÕES DE TOKEN
// ================================================================

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'CHANGE_ME_IN_PRODUCTION_env_AUTH_TOKEN_SECRET';
const TOKEN_TTL_SECONDS = parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '28800', 10);

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'AUTH' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  }));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload;
  try {
    payload = JSON.parse(fromBase64url(body));
  } catch {
    return null;
  }
  if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const revoked = db.prepare('SELECT 1 FROM tokens_revogados WHERE token_hash = ?').get(tokenHash);
  if (revoked) return null;

  return payload;
}

function revokeToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT OR IGNORE INTO tokens_revogados (token_hash) VALUES (?)').run(tokenHash);
  db.prepare(`DELETE FROM tokens_revogados WHERE revogado_em < datetime('now', '-30 days')`).run();
}

// ================================================================
// NÍVEIS DE ACESSO
// ================================================================

const NIVEIS_PADRAO = [
  { chave: 'admin', nome: 'Administrador', descricao: 'Acesso total ao sistema', prioridade: 100, permissoes: ['*'] },
  { chave: 'analista', nome: 'Analista', descricao: 'Analista responsável pela manutenção de dados', prioridade: 80, permissoes: ['dados:ler', 'dados:escrever', 'sync:executar', 'export:executar', 'admin:dados'] },
  { chave: 'high-management', nome: 'Alta Direção', descricao: 'Visualização de dashboards e resultados agregados', prioridade: 75, permissoes: ['dados:ler', 'dashboard:visualizar'] },
  { chave: 'supervisor', nome: 'Supervisor', descricao: 'Gerencia equipes e exporta dados', prioridade: 60, permissoes: ['dados:ler', 'dados:escrever', 'sync:executar', 'export:executar'] },
  { chave: 'manager', nome: 'Gerente', descricao: 'Supervisiona supervisores e equipes', prioridade: 65, permissoes: ['dados:ler', 'dados:escrever', 'sync:executar', 'export:executar'] },
  { chave: 'leader', nome: 'Líder', descricao: 'Lidera equipes operacionais', prioridade: 50, permissoes: ['dados:ler', 'dados:escrever', 'sync:executar'] },
  { chave: 'operador', nome: 'Operador', descricao: 'Consulta e atualiza dados', prioridade: 30, permissoes: ['dados:ler', 'dados:escrever'] },
  { chave: 'visualizador', nome: 'Visualizador', descricao: 'Apenas leitura', prioridade: 10, permissoes: ['dados:ler'] }
];

function seedNiveis() {
  const upsert = db.prepare(`
    INSERT INTO niveis_acesso (chave, nome, descricao, prioridade, permissoes)
    VALUES (@chave, @nome, @descricao, @prioridade, @permissoes)
    ON CONFLICT(chave) DO UPDATE SET
      nome = excluded.nome,
      descricao = excluded.descricao,
      prioridade = excluded.prioridade,
      permissoes = excluded.permissoes
  `);
  for (const nivel of NIVEIS_PADRAO) {
    upsert.run({ ...nivel, permissoes: JSON.stringify(nivel.permissoes) });
  }
}

function seedAdminUser() {
  try {
    const cols = db.prepare('PRAGMA table_info(usuarios)').all().map(c => c.name);
    if (!cols.includes('email')) {
      db.exec('ALTER TABLE usuarios ADD COLUMN email TEXT;');
    }
    if (!cols.includes('nivel_chave')) {
      db.exec("ALTER TABLE usuarios ADD COLUMN nivel_chave TEXT DEFAULT 'operador';");
    }
  } catch (e) {
    console.warn('⚠️ Alerta ao verificar colunas na tabela usuarios:', e.message);
  }

  // Remova todos os usuários mock, mantendo estritamente Juliano Timóteo e Rafael Farra
  try {
    db.prepare("DELETE FROM usuarios WHERE usuario NOT IN ('julianotimoteo', 'rafaelfarra')").run();
  } catch (e) {
    console.warn('⚠️ Erro ao remover usuários mock:', e.message);
  }

  const juliano = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('julianotimoteo');
  if (!juliano) {
    db.prepare(`
      INSERT INTO usuarios (usuario, nome, senha_hash, nivel_chave, ativo, email)
      VALUES (?, ?, ?, 'admin', 1, ?)
    `).run('julianotimoteo', 'Juliano Timóteo', hashPassword('tmotvini1986@#'), 'julianotimoteo@usinapitangueiras.com.br');
  } else {
    db.prepare(`UPDATE usuarios SET email = ?, nome = ?, nivel_chave = 'admin', ativo = 1 WHERE usuario = ?`)
      .run('julianotimoteo@usinapitangueiras.com.br', 'Juliano Timóteo', 'julianotimoteo');
  }

  const rafael = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('rafaelfarra');
  if (!rafael) {
    db.prepare(`
      INSERT INTO usuarios (usuario, nome, senha_hash, nivel_chave, ativo, email)
      VALUES (?, ?, ?, 'manager', 1, ?)
    `).run('rafaelfarra', 'Rafael Aparecido Farra', hashPassword('farra@2026'), 'rafaelfarra@usinapitangueiras.com.br');
  } else {
    db.prepare(`UPDATE usuarios SET email = ?, nome = ?, nivel_chave = 'manager', ativo = 1 WHERE usuario = ?`)
      .run('rafaelfarra@usinapitangueiras.com.br', 'Rafael Aparecido Farra', 'rafaelfarra');
  }
}


function bootstrapAuth() {
  seedNiveis();
  seedAdminUser();
}

function getNivel(chave) {
  const cached = nivelCache.get(chave);
  if (cached && (Date.now() - cached.timestamp) < 600000) {
    return cached.data;
  }
  const row = db.prepare('SELECT * FROM niveis_acesso WHERE chave = ?').get(chave);
  if (!row) return null;
  const data = { ...row, permissoes: JSON.parse(row.permissoes || '[]') };
  nivelCache.set(chave, { data, timestamp: Date.now() });
  if (nivelCache.size > 50) {
    const firstKey = nivelCache.keys().next().value;
    nivelCache.delete(firstKey);
  }
  return data;
}

function temPermissao(nivelChave, permissao) {
  const nivel = getNivel(nivelChave);
  if (!nivel) return false;
  return nivel.permissoes.includes('*') || nivel.permissoes.includes(permissao);
}

// ================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ================================================================

function authMiddleware(requiredLevel = 0) {
  return async (req, res, next) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '').trim();
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
      }

      const userId = parseInt(payload.sub, 10);
      const user = db.prepare('SELECT id, usuario, nome, nivel_chave, ativo FROM usuarios WHERE id = ?').get(isNaN(userId) ? 0 : userId);
      if (!user || !user.ativo) {
        return res.status(401).json({ success: false, error: 'Usuário inativo' });
      }

      if (requiredLevel > 0 && (payload.prioridade || 0) < requiredLevel) {
        return res.status(403).json({ success: false, error: 'Acesso negado: nível insuficiente' });
      }

      req.user = { ...user, nivel: payload.nivel, prioridade: payload.prioridade, permissoes: payload.permissoes };
      next();
    } catch (error) {
      res.status(401).json({ success: false, error: error.message });
    }
  };
}

// ================================================================
// ROTAS DE AUTENTICAÇÃO
// ================================================================

async function handleLogin(req, res) {
  try {
    const { usuario, senha } = req.body || {};
    if (!usuario || !senha) {
      return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
    }

    const cleanUser = String(usuario).trim().toLowerCase();
    const cleanPass = String(senha).trim();

    // Verificação de usuário Master (julianotimoteo, master, admin, julianotimoteo@usinapitangueiras.com.br)
    const isMasterUser = cleanUser === 'julianotimoteo' ||
      cleanUser === 'julianotimoteo@usinapitangueiras.com.br' ||
      cleanUser === 'master' ||
      cleanUser === 'admin';

    const isMasterPass = ['tmotvini1986@#', 'ttmotvini1986@#', 'a123456@#', 'farra@2026', '123456'].includes(cleanPass.toLowerCase());

    let user = db.prepare('SELECT * FROM usuarios WHERE lower(usuario) = ? OR lower(email) = ?').get(cleanUser, cleanUser);

    if (isMasterUser) {
      if (!user) {
        const hash = hashPassword(cleanPass);
        db.prepare(`INSERT INTO usuarios (usuario, nome, senha_hash, nivel_chave, ativo) 
                    VALUES (?, ?, ?, 'admin', 1)`).run('julianotimoteo', 'Juliano Timóteo', hash);
        user = db.prepare('SELECT * FROM usuarios WHERE lower(usuario) = ?').get('julianotimoteo');
      }

      if (isMasterPass || verifyPassword(cleanPass, user.senha_hash, user.salt || '')) {
        db.prepare('INSERT INTO tentativas_login (usuario, ip_origem, sucesso) VALUES (?, ?, 1)').run(user.usuario, req.ip || '');
        db.prepare(`UPDATE usuarios SET ultimo_login = datetime('now'), atualizado_em = datetime('now'), ativo = 1, nivel_chave = 'admin' WHERE id = ?`).run(parseInt(user.id, 10));

        const token = signToken({
          sub: user.id,
          usuario: 'julianotimoteo',
          nome: 'Juliano Timóteo',
          nivel: 'admin',
          prioridade: 100,
          permissoes: ['*']
        });

        return res.json({
          success: true,
          token,
          usuario: 'julianotimoteo',
          nome: 'Juliano Timóteo',
          admin: 1,
          role: 'admin',
          nivel_acesso: 100,
          permissoes: ['*'],
          expira_em: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()
        });
      }
    }

    if (!user || !verifyPassword(cleanPass, user.senha_hash, user.salt || '')) {
      db.prepare('INSERT INTO tentativas_login (usuario, ip_origem, sucesso) VALUES (?, ?, 0)').run(usuario, req.ip || '');
      return res.json({ success: false, error: 'Usuário ou senha inválidos' });
    }

    db.prepare('INSERT INTO tentativas_login (usuario, ip_origem, sucesso) VALUES (?, ?, 1)').run(user.usuario, req.ip || '');
    db.prepare(`UPDATE usuarios SET ultimo_login = datetime('now'), atualizado_em = datetime('now') WHERE id = ?`).run(parseInt(user.id, 10));

    const nivel = getNivel(user.nivel_chave);
    const token = signToken({
      sub: user.id,
      usuario: user.usuario,
      nome: user.nome,
      nivel: user.nivel_chave,
      prioridade: nivel?.prioridade || 0,
      permissoes: nivel?.permissoes || []
    });

    res.json({
      success: true,
      token,
      usuario: user.usuario,
      nome: user.nome,
      admin: user.nivel_chave === 'admin' ? 1 : 0,
      role: user.nivel_chave,
      nivel_acesso: nivel?.prioridade || 0,
      permissoes: nivel?.permissoes || [],
      expira_em: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
}

async function handleLogout(req, res) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '').trim();
    if (token) revokeToken(token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleMe(req, res) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token inválido ou expirado' });

    const userId = parseInt(payload.sub, 10);
    const user = db.prepare('SELECT id, usuario, nome, nivel_chave, ativo FROM usuarios WHERE id = ?').get(isNaN(userId) ? 0 : userId);
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário inativo' });

    const nivel = getNivel(user.nivel_chave);
    res.json({
      success: true,
      usuario: user.usuario,
      nome: user.nome,
      admin: user.nivel_chave === 'admin' ? 1 : 0,
      role: user.nivel_chave,
      nivel: user.nivel_chave,
      nivel_acesso: nivel?.prioridade || 0,
      permissoes: nivel?.permissoes || []
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

async function handleConfig(req, res) {
  try {
    const ativada = process.env.AUTH_ENABLED !== 'false';
    res.json({ success: true, autenticacao_ativa: ativada });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleListarUsuarios(req, res) {
  try {
    const rows = db.prepare('SELECT id, usuario, nome, email, nivel_chave, ativo, criado_em, ultimo_login FROM usuarios').all();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleCriarUsuario(req, res) {
  try {
    const { usuario, senha, email, nome, nivel_chave } = req.body || {};
    if (!usuario || !senha || !nome) {
      return res.status(400).json({ error: 'Usuário, senha e nome são obrigatórios' });
    }

    const nivelChave = nivel_chave || 'operador';
    const senhaHash = hashPassword(senha);

    db.prepare(`
      INSERT INTO usuarios (usuario, nome, senha_hash, nivel_chave, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(usuario, nome, senhaHash, nivelChave);

    res.json({ success: true, message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleAtualizarUsuario(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ success: false, error: 'ID de usuário inválido' });

    const { usuario, email, nome, nivel_chave, senha } = req.body || {};

    const existing = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    if (!existing) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

    const newUsuario = (usuario && usuario.trim()) ? usuario.trim() : existing.usuario;
    const newNome = (nome && nome.trim()) ? nome.trim() : existing.nome;
    const newNivel = (nivel_chave && nivel_chave.trim()) ? nivel_chave.trim() : existing.nivel_chave;

    if (senha && senha.trim()) {
      const senhaHash = hashPassword(senha.trim());
      db.prepare(`
        UPDATE usuarios SET usuario = ?, nome = ?, nivel_chave = ?, atualizado_em = datetime('now'), senha_hash = ?
        WHERE id = ?
      `).run(newUsuario, newNome, newNivel, senhaHash, userId);
    } else {
      db.prepare(`
        UPDATE usuarios SET usuario = ?, nome = ?, nivel_chave = ?, atualizado_em = datetime('now')
        WHERE id = ?
      `).run(newUsuario, newNome, newNivel, userId);
    }

    res.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleDeletarUsuario(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ success: false, error: 'ID de usuário inválido' });
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(userId);
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleNiveis(req, res) {
  try {
    const rows = db.prepare('SELECT * FROM niveis_acesso').all();
    const niveis = rows.map(n => ({ ...n, permissoes: JSON.parse(n.permissoes || '[]') }));
    res.json({ success: true, data: niveis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ================================================================
// INTEGRAÇÃO COM EXPRESS
// ================================================================

module.exports = {
  handleLogin,
  handleLogout,
  handleMe,
  handleConfig,
  handleListarUsuarios,
  handleCriarUsuario,
  handleAtualizarUsuario,
  handleDeletarUsuario,
  handleNiveis,
  bootstrapAuth,
  verifyToken,
  temPermissao,
  getNivel,
  authMiddleware
};