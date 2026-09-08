# API Endpoints - Read/Write Guide

**Base URL:** `http://<IP_DO_SERVIDOR>:8000`  
**Formato:** JSON  
**CORS:** Habilitado  
**Legado:** mantenha todas as integrações existentes; novas integrações devem preferir `Bearer JWT`.

---

## Convenções

- `success=true` indica resposta válida.
- Erros retornam `success=false` com `error` descritivo.
- Datas podem variar entre `YYYY-MM-DD`, `YYYY-MM-DD HH:MM:SS` e ISO8601.

---

## Endpoints Públicos (Leitura)

### `/health`
**Método:** `GET`  
**Descrição:** Verificação rápida de disponibilidade.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-02T19:00:00"
}
```

### `/api/status`
**Método:** `GET`  
**Descrição:** Status geral do sistema, contadores de OS, equipamentos e última sincronização.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/status
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "status": "online",
    "totalOS": 67,
    "osAbertas": 67,
    "osFechadas": 0,
    "totalEquip": 64,
    "equipOs": 60,
    "equipOk": 4,
    "ultimaSincronizacao": "01/09/2026 09:30:00",
    "tabelasBanco": ["ordens_servico", "equipamentos"],
    "syncRunning": true
  }
}
```

### `/api/os`
**Método:** `GET`  
**Descrição:** Lista ordens de serviço.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/os
```

### `/api/equipamentos`
**Método:** `GET`  
**Descrição:** Lista equipamentos com status de OS.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/equipamentos
```

### `/api/operacoes`
**Método:** `GET`  
**Descrição:** Lista operações.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/operacoes
```

### `/api/coa`
**Método:** `GET`  
**Descrição:** Lista viagens COA.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/coa
```

### `/api/tables`
**Método:** `GET`  
**Descrição:** Lista tabelas disponíveis no SQLite.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/tables
```

### `/api/tables/<table_name>`
**Método:** `GET`  
**Descrição:** Dados de uma tabela específica.  
**Parâmetros:** `limit`, `offset`

**Exemplo:**
```bash
curl "http://172.16.12.36:8000/api/tables/ordens_servico?limit=10&offset=0"
```

### `/api/export`
**Método:** `GET`  
**Descrição:** Exporta dados em JSON ou CSV.  
**Parâmetros:** `format=json|csv`, `table`

**Exemplo:**
```bash
curl "http://172.16.12.36:8000/api/export?format=csv&table=ordens_servico"
```

### `/api/system`
**Método:** `GET`  
**Descrição:** Métricas do servidor, disco, memória, banco e sync.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/system
```

### `/api/sync/health`
**Método:** `GET`  
**Descrição:** Saúde do scraper/sincronizador.

**Exemplo:**
```bash
curl http://172.16.12.36:8000/api/sync/health
```

---

## Endpoints Protegidos (Escrita / Administrativos)

### `/api/sync`
**Método:** `POST`  
**Descrição:** Sincronização manual.  
**Headers:** `X-API-Key` ou acesso local `127.0.0.1`

**Exemplo:**
```bash
curl -X POST http://172.16.12.36:8000/api/sync \
  -H "X-API-Key: <chave>"
```

### `/api/responsaveis`
**Método:** `GET`, `POST`  
**Descrição:** Lista ou cria responsáveis.

**Exemplo create:**
```bash
curl -X POST http://172.16.12.36:8000/api/responsaveis \
  -H "Content-Type: application/json" \
  -d '{"nome":"Joao","matricula":"123","cargo":"Supervisor","setor":"CAMPO"}'
```

### `/api/responsaveis/<id>`
**Método:** `PUT`, `DELETE`  
**Descrição:** Atualiza ou remove responsável.

### `/api/inscricoes`
**Método:** `GET`, `POST`  
**Descrição:** Lista ou cria inscrições.

**Exemplo create:**
```bash
curl -X POST http://172.16.12.36:8000/api/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"tipo":"Manutencao","codigo":"OS-1","descricao":"Troca de oleo","status":"pendente"}'
```

### `/api/inscricoes/<id>`
**Método:** `PUT`, `DELETE`  
**Descrição:** Atualiza ou remove inscrição.

### `/api/alteracoes`
**Método:** `GET`, `POST`  
**Descrição:** Lista ou registra alterações de auditoria.

### `/api/usuarios`
**Método:** `GET`, `POST`  
**Descrição:** Lista ou cria usuários. Protegido por admin quando autenticação estiver ativa.

**Exemplo create:**
```bash
curl -X POST http://172.16.12.36:8000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"usuario":"novo","senha":"segredo","nome":"Novo Usuario","admin":0}'
```

### `/api/usuarios/<id>`
**Método:** `PUT`, `DELETE`  
**Descrição:** Atualiza ou remove usuário.

### `/api/auth/login`
**Método:** `POST`  
**Descrição:** Autentica usuário e retorna session token.

```bash
curl -X POST http://172.16.12.36:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"segredo"}'
```

### `/api/auth/token`
**Método:** `POST`  
**Descrição:** Retorna JWT Bearer para integrações externas.

```bash
curl -X POST http://172.16.12.36:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"segredo"}'
```

### `/api/auth/refresh`
**Método:** `POST`  
**Headers:** `Authorization: Bearer <jwt>`  
**Descrição:** Renova JWT.

```bash
curl -X POST http://172.16.12.36:8000/api/auth/refresh \
  -H "Authorization: Bearer <jwt>"
```

### `/api/auth/me`
**Método:** `GET`  
**Headers:** `Authorization: Bearer <jwt>` ou `?token=<session_token>`  
**Descrição:** Retorna dados do usuário autenticado.

```bash
curl http://172.16.12.36:8000/api/auth/me \
  -H "Authorization: Bearer <jwt>"
```

### `/api/auth/config`
**Método:** `GET`  
**Descrição:** Mostra se autenticação está ativa.

```bash
curl http://172.16.12.36:8000/api/auth/config
```

### `/api/niveis`
**Método:** `GET`  
**Descrição:** Lista níveis de acesso.

```bash
curl http://172.16.12.36:8000/api/niveis \
  -H "Authorization: Bearer <jwt>"
```

---

## Observações

- Nunca remova ou renomeie rotas públicas legadas sem mapear todos os consumidores.
- Para escrita, prefira `Bearer JWT` em integrações novas.
- Exemplo JavaScript:
  ```javascript
  const response = await fetch('http://172.16.12.36:8000/api/tables/ordens_servico?limit=10');
  const result = await response.json();
  console.log(result.data);
  ```
- Exemplo Python:
  ```python
  import requests
  base = 'http://172.16.12.36:8000'
  r = requests.get(f'{base}/api/status')
  print(r.json()['data']['osAbertas'])
  ```
