# User Auth & Database Integration

**Banco central:** `meus_banco.db`  
**Backend:** Flask (`backend/app.py`)  
**Objetivo:** permitir que programas terceiros consumam este servidor como banco centralizado, com autenticação forte e rastreabilidade.

---

## 1. Arquitetura

```
Programas Terceiros
       |
       v
  Backend Flask
   - Autenticação
   - Autorização
   - CRUD centralizado
       |
       v
  SQLite (`meus_banco.db`)
   - usuarios
   - sessoes
   - niveis_acesso
   - responsaveis
   - inscricoes
   - registro_alteracoes
   - tabelas operacionais
```

---

## 2. Autenticação

### 2.1 Opções disponíveis

- **Session token:** rota `/api/auth/login`. Ideal para uso humano/admin.
- **Bearer JWT:** rota `/api/auth/token`. Ideal para integrações externas.
- **Refresh:** rota `/api/auth/refresh` renova JWT sem nova senha.

### 2.2 Segurança

- Senhas armazenadas com `pbkdf2_hmac('sha256', 100000)` + salt.
- Sessões registradas em `sessoes` com `expira_em`.
- Tokens JWT assinados com `JWT_SECRET_KEY`.
- Logs de tentativas em `tentativas_login`.

### 2.3 Validação

- `/api/auth/me` retorna dados do usuário autenticado via Bearer ou session token.
- `/api/auth/config` retorna se autenticação está ativa (`AUTH_ENABLED`).

---

## 3. Integração com Programas Terceiros

### 3.1 Regra geral

- Use `Bearer JWT` para integrações.
- Não compartilhe senhas entre sistemas.
- Consuma apenas endpoints necessários.
- Respeite quotas e timeouts do backend.

### 3.2 Exemplo Python

```python
import requests

BASE = 'http://172.16.12.36:8000'

login = requests.post(f'{BASE}/api/auth/token', json={
    'usuario': 'integrador',
    'senha': 'segredo',
})
token = login.json()['access_token']

headers = {'Authorization': f'Bearer {token}'}

r = requests.get(f'{BASE}/api/tables/ordens_servico?limit=10', headers=headers)
print(r.json())
```

### 3.3 Exemplo JavaScript

```javascript
const base = 'http://172.16.12.36:8000';

async function login() {
  const r = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({usuario: 'integrador', senha: 'segredo'}),
  });
  const data = await r.json();
  return data.access_token;
}

async function load() {
  const token = await login();
  const res = await fetch(`${base}/api/tables/ordens_servico?limit=10`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  const json = await res.json();
  console.log(json.data);
}

load();
```

---

## 4. Banco de Dados

### 4.1 Tabelas de Identidade

- `usuarios`: usuários ativos/inativos, hash de senha, admin.
- `sessoes`: sessões legadas por token.
- `niveis_acesso`: níveis funcionais.
- `responsaveis`: pessoas responsáveis por ações/inscrições.
- `inscricoes`: registros de demanda vinculados a responsáveis.
- `registro_alteracoes`: trilha de auditoria.

### 4.2 Tabelas Operacionais

- `ordens_servico`
- `equipamentos`
- `operacoes`
- `coa_viagens`
- `painel_metricas`
- `sincronizacao_log`
- `BH_Report`
- `Logistica`
- `Producao`
- `Locais_Atacados`
- `Processo_Plantio`
- `entrada_cana_dia`
- `disponibilidade`

### 4.3 Regras

- Integrações devem usar as rotas Flask; acesso direto ao SQLite só em cenários suportados.
- Alterações manuais diretas no banco devem ser registradas em `registro_alteracoes`.
- Campos `data_sincronizacao` indicam atualização por sync automática.

---

## 5. Operação

- Sync automático: padrão a cada 30s, com backoff adaptativo até 300s em falhas.
- Sync manual: `/api/sync` para execução sob demanda.
- Saúde: `/api/sync/health` e `/api/system` para monitoramento.

---

## 6. Segurança

- Credenciais do SimpleFarm sao armazenadas apenas no backend.
- Nunca exponha `SF_USERNAME`, `SF_PASSWORD` ou `JWT_SECRET_KEY`.
- Autenticação local por padrão desativada; ative via `AUTH_ENABLED=true` quando necessário.
- Acesso por `127.0.0.1` libera algumas rotas administrativas locais.
