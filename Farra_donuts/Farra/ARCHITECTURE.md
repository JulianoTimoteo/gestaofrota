# Arquitetura do Sistema - Enterprise Guide

**Projeto:** SimpleFarm Integration  
**Objetivo:** fornecer visão arquitetural, padrões, dependências e operação do backend/frontend/banco para times de produto, plataforma e integração.

---

## 1. Visão Geral

O sistema é composto por:

- **Backend Flask** (`backend/app.py`)
  - API REST pública e protegida.
  - Scraping/sincronização automática e manual.
  - Autenticação local + JWT Bearer.
  - Integração com banco SQLite.

- **Frontend**
  - `index.html`: aplicação principal com abas, filtros e exportação.
  - `glass.html`: dashboard otimizado para tablet/screen, com abas, donuts animados e status do scraper.
  - `monitor.html`: página de monitoramento.

- **Banco de Dados**
  - SQLite (`meus_banco.db`), com prioridade para `D:\meus_banco.db` quando disponível.
  - Tabelas operacionais, identidade e auditoria.

- **Integração Externa**
  - SimpleFarm via HTTPS com fallback Playwright.
  - Endpoints públicos preservados para legado.

---

## 2. Backend

### 2.1 Stack

- Python 3.11+
- Flask + Flask-CORS
- SQLite3 + WAL
- Requests + Playwright (fallback)
- PyJWT
- psutil

### 2.2 Rotas Principais

- Páginas: `/`, `/monitor`, `/glass`
- API pública: `/api/status`, `/api/os`, `/api/equipamentos`, `/api/operacoes`, `/api/coa`, `/api/tables`, `/api/export`, `/api/system`
- Scraper: `/api/sync`, `/api/sync/health`
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/config`, `/api/auth/token`, `/api/auth/refresh`
- Entidades: `/api/responsaveis`, `/api/inscricoes`, `/api/alteracoes`, `/api/usuarios`, `/api/niveis`

### 2.3 Serviço de Sincronização

- Ciclo automático com backoff adaptativo.
- Login com retry.
- Métricas via `GetWidgetValue`.
- OS via `GetLists` + fallback Playwright.
- Logs detalhados em `sincronizacao_log`.

### 2.4 Autenticação

- Senhas: PBKDF2-SHA256 + salt.
- Sessões: token aleatório com expiração.
- JWT: HS256, 12h, renovação via `/api/auth/refresh`.
- Acesso local `127.0.0.1` libera rotas administrativas quando `AUTH_ENABLED=false`.

---

## 3. Frontend

### 3.1 stack

- HTML/CSS/JS puro (sem build).
- Design system próprio com glassmorphism.
- Responsividade voltada para S7 (1280x800) e desktop.

### 3.2 Páginas

- `/` - aplicação principal com abas.
- `/glass` - dashboard compacto com donuts e status.
- `/monitor` - monitor do sistema.

### 3.3 Integração

- API consumida por `XMLHttpRequest`/`fetch`.
- Polling automático a cada 30s no `/glass`.
- Fallback visual em caso de erro de conexão.

---

## 4. Banco de Dados

### 4.1 Arquivo

- Padrão: `meus_banco.db` na raiz.
- Fallback: `D:\meus_banco.db` se existir.

### 4.2 Tabelas

**Identidade e Controle**

- `usuarios`: usuários ativos/inativos, hash, salt, admin.
- `sessoes`: sessões legadas.
- `tentativas_login`: auditoria de login.
- `niveis_acesso`: níveis funcionais.
- `responsaveis`: pessoas responsáveis.
- `inscricoes`: demandas vinculadas.
- `registro_alteracoes`: trilha de auditoria.

**Operacionais**

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

- WAL mode habilitado.
- Timeout de 30s para evitar locks.
- Acesso exclusivo via Flask em produção.

---

## 5. Segurança

- Credenciais do SimpleFarm apenas no backend (.env).
- Senhas locais com PBKDF2 + salt.
- JWT com secret configurável.
- CORS habilitado.
- API Key mantida para legado.

---

## 6. Operação

- Start: `python backend/app.py`
- ADB reverse: `adb reverse tcp:8000 tcp:8000`
- Acesso tablet: `http://localhost:8000/glass`
- Logs: stdout + arquivo.
- Monitor: `/api/system`, `/api/sync/health`.

---

## 7. Manutenção

- Nunca altere assinatura de rotas legadas sem mapear consumidores.
- Backups do banco devem ser feitos com serviço parado ou via WAL checkpoint.
- Playwright é opcional; sem ele, o fallback de scraping pode ser reduzido.
