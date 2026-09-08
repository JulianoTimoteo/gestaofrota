const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/sw.js', express.static(path.join(__dirname, 'sw.js'), {
    headers: { 'Content-Type': 'application/javascript' }
}));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));
app.get('/all.min.css', (req, res) => res.status(204).end());
app.use(express.static('.', {
    maxAge: 0,
    etag: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

let auth;
try {
    auth = require('./auth');
    auth.bootstrapAuth();
} catch (err) {
    console.error('\n❌ ERRO FATAL ao iniciar o módulo de autenticação:', err.message);
    console.error('   Verifique se a pasta do projeto tem permissão de escrita (para criar o banco de dados)');
    console.error('   e se a variável AUTH_DB_PATH (se definida) aponta para um caminho válido.\n');
    process.exit(1);
}

const PORT = 3000;
const HOST = '0.0.0.0';
const PYTHON_API = 'http://127.0.0.1:8000';
const REQUEST_TIMEOUT = 120000;
const CACHE_TTL = 5000; // 5 segundos de cache para refletir estado de conexão em tempo real

// ================================================================
// CACHE EM MEMÓRIA PARA REDUZIR CHAMADAS AO PYTHON BACKEND
// ================================================================

const apiCache = new Map();

function getCacheKey(url) {
    return url;
}

function getCached(url) {
    const cached = apiCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCache(url, data) {
    apiCache.set(url, { data, timestamp: Date.now() });
    if (apiCache.size > 100) {
        const firstKey = apiCache.keys().next().value;
        apiCache.delete(firstKey);
    }
}

function invalidateCache(prefix) {
    for (const key of apiCache.keys()) {
        if (key.startsWith(prefix)) {
            apiCache.delete(key);
        }
    }
}

// ================================================================
// POOL DE CONEXÕES AXIOS (CONNECTION KEEP-ALIVE)
// ================================================================

const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 20 });

const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: REQUEST_TIMEOUT,
    validateStatus: (status) => status < 500
});

// ================================================================
// FUNÇÕES AUXILIARES
// ================================================================

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

// ================================================================
// PROXY PARA API PYTHON (COM CACHE)
// ================================================================

async function proxyGet(endpoint, useCache = true) {
    const url = `${PYTHON_API}${endpoint}`;
    if (useCache) {
        const cached = getCached(url);
        if (cached) {
            return cached;
        }
    }
    const response = await axiosInstance.get(url);
    const data = response.data;
    if (useCache) {
        setCache(url, data);
    }
    return data;
}

async function proxyPost(endpoint, body, invalidate = true) {
    const response = await axiosInstance.post(`${PYTHON_API}${endpoint}`, body);
    if (invalidate) {
        invalidateCache(`${PYTHON_API}/api/os`);
        invalidateCache(`${PYTHON_API}/api/equipamentos`);
        invalidateCache(`${PYTHON_API}/api/operacoes`);
        invalidateCache(`${PYTHON_API}/api/status`);
    }
    return response.data;
}

// ================================================================
// MAPEAMENTO DE CAMPOS PARA O FRONTEND
// ================================================================

function mapOperacoes(data) {
    if (!Array.isArray(data)) return data;
    return data.map(op => ({
        codigo: op['Código'] || op.codigo || '',
        descricao: op['Descrição'] || op.descricao || '',
        tipoOperacao: op['Tipo de Operação'] || op.tipoOperacao || '',
        corporativo: op['Corporativo'] || op.corporativo || '',
        grupoOperacao: op['Grupo de Operação'] || op.grupoOperacao || '',
        status: op['Status'] || op.status || '',
        equipe: op.equipe || op.Equipe || '',
        estado: op['Estado'] || op.estado || '',
        tempoOperacao: op['Tempo de Operação'] || op.tempoOperacao || '',
        grupoParada: op['Grupo Parada'] || op.grupoParada || '',
        grupoAtividade: op['Grupo de Atividade'] || op.grupoAtividade || '',
        operacaoERP: op['Operação ERP'] || op.operacaoERP || '',
        dataSincronizacao: op.data_sincronizacao || op.dataSincronizacao || ''
    }));
}

function mapEquipamentos(data) {
    if (!Array.isArray(data)) return data;
    return data.map(eq => ({
        codigo: String(eq['Código'] || eq.codigo || ''),
        descricao: eq['Descrição'] || eq.descricao || '',
        modelo: eq['Modelo'] || eq.modelo || '',
        tipo: eq['Tipo'] || eq.tipo || '',
        grupo: eq['Grupo'] || eq.grupo || '',
        statusOS: eq.statusOS || '',
        codOS: eq.codOS || ''
    }));
}

function mapOS(data) {
    if (!Array.isArray(data)) return data;
    return data.map(os => ({
        codOS: os.codOS || '',
        codigoEquip: os.codigoEquip || '',
        frotaCC: os.frotaCC || '',
        statusOS: os.statusOS || '',
        tipoOficina: os.tipoOficina || '',
        oficina: os.oficina || '',
        dataEntrada: os.dataEntrada || '',
        dataPrevisao: os.dataPrevisao || '',
        diasPermanencia: os.diasPermanencia || '',
        descricao: os.descricao || '',
        tipoOS: os.tipoOS || '',
        subClasse: os.subClasse || '',
        dataSincronizacao: os.dataSincronizacao || ''
    }));
}

// ================================================================
// HEALTH CHECK (COM CACHE)
// ================================================================

app.get('/api/health', async (req, res) => {
    const health = {
        status: 'ok',
        node: 'ok',
        database: 'ok',
        auth: process.env.AUTH_ENABLED !== 'false' ? 'enabled' : 'disabled',
        python_backend: 'unknown',
        tablet: 'offline'
    };

    try {
        await axiosInstance.get(`${PYTHON_API}/health`, { timeout: 3000 });
        health.python_backend = 'ok';
    } catch (e) {
        health.python_backend = 'offline';
    }

    const fs = require('fs');
    const tabletPath = '/sdcard/meus_banco.db';
    if (fs.existsSync(tabletPath)) {
        health.tablet = 'online';
    }

    res.json(health);
});

// ================================================================
// AUTH MIDDLEWARE
// ================================================================

const requireAuth = auth.authMiddleware(0);
const requireAdmin = auth.authMiddleware(100);
const requireAnalyst = auth.authMiddleware(80);

// ================================================================
// API ENDPOINTS - AUTOMATIC SYNC
// ================================================================

// Auto-sync: retorna dados imediatamente do banco, sincroniza em background
app.post('/api/auto-sync', requireAuth, async (req, res) => {
    try {
        const [osData, equipData, operData, statusData] = await Promise.all([
            proxyGet('/api/os'),
            proxyGet('/api/equipamentos'),
            proxyGet('/api/operacoes'),
            proxyGet('/api/status')
        ]);

        res.json({
            success: true,
            data: {
                equipamentos: mapEquipamentos(equipData.data || []),
                operacoes: mapOperacoes(operData.data || []),
                ordensServico: mapOS(osData.data || []),
                ultimaSincronizacao: statusData.data?.ultimaSincronizacao || new Date().toISOString(),
                counts: {
                    equipamentos: (equipData.data || []).length,
                    operacoes: (operData.data || []).length,
                    ordensServico: (osData.data || []).length
                }
            }
        });

        invalidateCache(`${PYTHON_API}/api`);
        proxyPost('/api/sync', { username: 'auto', password: 'auto' }).catch(() => {});
    } catch (error) {
        console.error('❌ Erro na sincronização automática:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sincronização completa (mantida para uso administrativo)
app.post('/api/sync', requireAuth, async (req, res) => {
    try {
        const syncResult = await proxyPost('/api/sync', req.body);
        
        const [osData, equipData] = await Promise.all([
            proxyGet('/api/os'),
            proxyGet('/api/equipamentos')
        ]);

        res.json({
            success: true,
            data: {
                equipamentos: equipData.total || equipData.data?.length || 0,
                operacoes: 0,
                ordensServico: osData.total || osData.data?.length || 0,
                ultimaSincronizacao: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Erro na sincronização:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Auto-Cure Watchdog Proxy Endpoint
app.all(['/api/sync/auto-cure'], requireAuth, async (req, res) => {
    try {
        const result = await proxyPost('/api/sync/auto-cure', req.body);
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao acionar Auto-Cure:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SYNC TABLET ====================

app.post('/api/sync/tablet/push', requireAuth, async (req, res) => {
    try {
        const { DatabaseSync } = require('node:sqlite');
        const tabletDbPath = '/sdcard/meus_banco.db';
        const fs = require('fs');

        if (!fs.existsSync(tabletDbPath)) {
            return res.json({ success: true, message: 'Tablet nao conectado ou banco nao encontrado', data: null });
        }

        const tabletDb = new DatabaseSync(tabletDbPath);
        const tables = ['equipamentos', 'operacoes', 'ordens_servico'];
        const result = {};

        for (const table of tables) {
            try {
                const rows = tabletDb.prepare(`SELECT * FROM ${table}`).all();
                result[table] = rows;
            } catch (e) {
                result[table] = [];
            }
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sync/tablet/pull', requireAuth, async (req, res) => {
    try {
        const { DatabaseSync } = require('node:sqlite');
        const tabletDbPath = '/sdcard/meus_banco.db';
        const fs = require('fs');

        fs.mkdirSync(path.dirname(tabletDbPath), { recursive: true });
        const tabletDb = new DatabaseSync(tabletDbPath);

        tabletDb.exec(`
            CREATE TABLE IF NOT EXISTS equipamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo INTEGER, descricao TEXT, modelo TEXT, tipo TEXT, grupo TEXT,
                data_sincronizacao TEXT
            );
            CREATE TABLE IF NOT EXISTS operacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo INTEGER, descricao TEXT, tipo_operacao TEXT, corporativo TEXT,
                grupo_operacao TEXT, tempo_operacao TEXT, estado TEXT, status TEXT,
                data_sincronizacao TEXT
            );
            CREATE TABLE IF NOT EXISTS ordens_servico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_os TEXT, sub_classe TEXT, frota_cc TEXT, codigo_equip TEXT,
                cod_os TEXT NOT NULL, status_os TEXT DEFAULT 'ABERTA',
                tipo_oficina TEXT, oficina TEXT, data_entrada TEXT, data_previsao TEXT,
                dias_permanencia TEXT, descricao TEXT, data_sincronizacao TEXT NOT NULL,
                UNIQUE(cod_os)
            );
        `);

        const syncData = req.body || {};
        let saved = 0;

        if (syncData.equipamentos && Array.isArray(syncData.equipamentos)) {
            for (const eq of syncData.equipamentos) {
                try {
                    tabletDb.prepare(`
                        INSERT OR REPLACE INTO equipamentos (codigo, descricao, modelo, tipo, grupo, data_sincronizacao)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(
                        eq.codigo || eq.Código,
                        eq.descricao || eq.Descrição,
                        eq.modelo || eq.Modelo,
                        eq.tipo || eq.Tipo,
                        eq.grupo || eq.Grupo,
                        new Date().toISOString()
                    );
                    saved++;
                } catch (e) {}
            }
        }

        if (syncData.operacoes && Array.isArray(syncData.operacoes)) {
            for (const op of syncData.operacoes) {
                try {
                    tabletDb.prepare(`
                        INSERT OR REPLACE INTO operacoes (codigo, descricao, tipo_operacao, corporativo, grupo_operacao, status, data_sincronizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        op.codigo || op.Código,
                        op.descricao || op.Descrição,
                        op.tipoOperacao || op.TipoOperacao,
                        op.corporativo || op.Corporativo,
                        op.grupoOperacao || op.GrupoOperacao,
                        op.status || op.Status,
                        new Date().toISOString()
                    );
                    saved++;
                } catch (e) {}
            }
        }

        if (syncData.ordensServico && Array.isArray(syncData.ordensServico)) {
            for (const os of syncData.ordensServico) {
                try {
                    tabletDb.prepare(`
                        INSERT OR REPLACE INTO ordens_servico (cod_os, codigo_equip, status_os, oficina, data_entrada, descricao, data_sincronizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        os.codOS || os.COD_OS,
                        os.codigoEquip || os.EQP_CC_AGD,
                        os.statusOS || os.STATUS_OS || 'ABERTA',
                        os.oficina || os.OFICINA,
                        os.dataEntrada || os.OS_DT_ENTRADA,
                        os.descricao || os.OS_OBSERVACAO,
                        new Date().toISOString()
                    );
                    saved++;
                } catch (e) {}
            }
        }

        res.json({ success: true, message: `Sincronizado ${saved} registros para o tablet`, saved });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================================================
// PERSISTÊNCIA JSON DAS CONFIGURAÇÕES ADMIN (ESTADO GLOBAL COMPARTILHADO)
// ================================================================
const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin_config.json');
const fs = require('fs');

function getAdminConfigFromFile() {
    if (!fs.existsSync(ADMIN_CONFIG_FILE)) {
        const initial = { customGroups: {}, customTypes: {}, customOps: {}, customOpTeams: {}, ultimaAlteracao: new Date().toISOString() };
        try { fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(initial, null, 2), 'utf8'); } catch(e){}
        return initial;
    }
    try {
        const str = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8');
        return JSON.parse(str);
    } catch(e) {
        return { customGroups: {}, customTypes: {}, customOps: {}, customOpTeams: {} };
    }
}

function saveAdminConfigToFile(data) {
    const current = getAdminConfigFromFile();
    if (data.customGroups) Object.assign(current.customGroups, data.customGroups);
    if (data.customTypes) Object.assign(current.customTypes, data.customTypes);
    if (data.customOps) Object.assign(current.customOps, data.customOps);
    if (data.customOpTeams) Object.assign(current.customOpTeams, data.customOpTeams);
    current.ultimaAlteracao = new Date().toISOString();
    try { fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(current, null, 2), 'utf8'); } catch(e){}
    return current;
}

app.get('/api/config/admin', (req, res) => {
    res.json({ success: true, data: getAdminConfigFromFile() });
});

app.post('/api/config/admin', (req, res) => {
    try {
        const updated = saveAdminConfigToFile(req.body || {});
        res.json({ success: true, message: 'Configurações do Admin salvas no JSON', data: updated });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Buscar dados (com cache)
app.get('/api/dados', requireAuth, async (req, res) => {
    try {
        const [osData, equipData, operData, statusData] = await Promise.all([
            proxyGet('/api/os'),
            proxyGet('/api/equipamentos'),
            proxyGet('/api/operacoes'),
            proxyGet('/api/status')
        ]);

        const adminConfig = getAdminConfigFromFile();

        res.json({
            success: true,
            data: {
                equipamentos: mapEquipamentos(equipData.data || []),
                operacoes: mapOperacoes(operData.data || []),
                ordensServico: mapOS(osData.data || []),
                adminConfig: adminConfig,
                ultimaSincronizacao: statusData.data?.ultimaSincronizacao || new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar dados:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar apenas Equipamentos (com cache)
app.get(['/api/equipamentos', '/api/tabelas/equipamentos', '/api/tabela/equipamentos'], requireAuth, async (req, res) => {
    try {
        const result = await proxyGet('/api/equipamentos');
        res.json({
            success: true,
            data: mapEquipamentos(result.data || []),
            total: result.total || 0
        });
    } catch (error) {
        console.error('❌ Erro ao buscar equipamentos:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Proxy generico para tabelas do banco
app.get(['/api/tables/:tabela', '/api/tabelas/:tabela', '/api/tabela/:tabela'], requireAuth, async (req, res) => {
    try {
        const result = await proxyGet(`/api/tables/${req.params.tabela}`);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cadastrar novo Equipamento / Frota
app.post('/api/equipamentos', requireAuth, async (req, res) => {
    try {
        const result = await proxyPost('/api/equipamentos', req.body);
        invalidateCache('/api/equipamentos');
        invalidateCache('/api/dados');
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao cadastrar equipamento:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar apenas Operações (com cache)
app.get('/api/operacoes', requireAuth, async (req, res) => {
    try {
        const result = await proxyGet('/api/operacoes');
        res.json({
            success: true,
            data: mapOperacoes(result.data || []),
            total: result.total || 0
        });
    } catch (error) {
        console.error('❌ Erro ao buscar operações:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cadastrar nova Operação Produtiva
app.post('/api/operacoes', requireAuth, async (req, res) => {
    try {
        const result = await proxyPost('/api/operacoes', req.body);
        invalidateCache('/api/operacoes');
        invalidateCache('/api/dados');
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao cadastrar operação:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar apenas OS (com cache)
app.get('/api/os', requireAuth, async (req, res) => {
    try {
        const result = await proxyGet('/api/os');
        res.json({
            success: true,
            data: mapOS(result.data || []),
            total: result.total || 0
        });
    } catch (error) {
        console.error('❌ Erro ao buscar OS:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar OS abertas (com cache)
app.get('/api/os/abertas', requireAuth, async (req, res) => {
    try {
        const result = await proxyGet('/api/os');
        const abertas = mapOS(result.data || []).filter(os => {
            const status = (os.statusOS || '').toUpperCase();
            return status === 'ABERTA' || status === 'Aberta';
        });
        res.json({
            success: true,
            data: abertas,
            total: abertas.length
        });
    } catch (error) {
        console.error('❌ Erro ao buscar OS abertas:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== AUTENTICACAO ====================

app.post('/api/auth/login', auth.handleLogin);
app.post('/api/auth/logout', auth.handleLogout);
app.get('/api/auth/me', auth.handleMe);
app.get('/api/auth/config', auth.handleConfig);

app.get('/api/usuarios', requireAdmin, auth.handleListarUsuarios);
app.post('/api/usuarios', requireAdmin, auth.handleCriarUsuario);
app.put('/api/usuarios/:id', requireAdmin, auth.handleAtualizarUsuario);
app.delete('/api/usuarios/:id', requireAdmin, auth.handleDeletarUsuario);
app.get('/api/niveis', requireAuth, auth.handleNiveis);

// Buscar log
app.get('/api/log', (req, res) => {
  res.json({
      success: true,
      log: [`[${new Date().toLocaleTimeString()}] Sistema conectado à API Python`, `[${new Date().toLocaleTimeString()}] Dados servidos via proxy`]
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ================================================================
// INICIAR SERVIDOR
// ================================================================

const serverInstance = app.listen(PORT, HOST, () => {
  const ips = getLocalIPs();
  console.log(`\n🚀 Servidor rodando em:`);
  console.log(`   Local: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`   Rede:`);
    ips.forEach(ip => console.log(`     http://${ip}:${PORT}`));
  }
  console.log(`🔗 Proxy API: ${PYTHON_API}`);
  console.log(`\n⚠️  Deixe este terminal aberto enquanto usa a aplicação.\n`);
});

// Otimizacao de Keep-Alive para alta concorrencia (ate 100 clientes em paralelo)
serverInstance.keepAliveTimeout = 65000;
serverInstance.headersTimeout = 66000;

serverInstance.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERRO FATAL: a porta ${PORT} já está em uso por outro processo.`);
    console.error(`   Feche o programa que está usando essa porta ou reinicie o computador e tente novamente.\n`);
  } else {
    console.error('\n❌ ERRO FATAL ao iniciar o servidor:', err.message, '\n');
  }
  process.exit(1);
});
