# API Access Guide

**Projeto:** SimpleFarm Integration  
**Ambiente:** Backend Flask + SQLite  
**Base URL:** `http://<IP_DO_SERVIDOR>:8000`  
**Documento:** Acesse também `README.md` para referência rápida.

---

## 1. Visão Geral de Acesso

A API expõe dois perfis de acesso:

- **Público / legado:** leitura de dados operacionais sem autenticação, inclusive via `127.0.0.1`. Essas rotas existentes não devem ser quebradas por integrações futuras.
- **Autenticado:** endpoints administrativos e de identidade, protegidos por sessão ou `Bearer JWT`.

Novos consumidores devem preferir `Bearer JWT` para integrações externas.

---

## 2. Como Solicitar Acesso

1. Abra chamado com o time responsável pelo servidor SimpleFarm Integration.
2. Informe:
   - sistema/cliente que irá consumir a API;
   - IPs/faixas de origem;
   - necessidade de leitura ou escrita;
   - quota esperada (req/s).
3. O time irá:
   - validar a integração no banco SQLite;
   - entregar as credenciais ou token no formato adequado.

---

## 3. Autenticação

### 3.1 Login local existente

```bash
curl -X POST http://172.16.12.36:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"sua-senha"}'
```

Retorno esperado:

```json
{
  "success": true,
  "token": "<session_token>",
  "usuario": "admin",
  "admin": 1,
  "expira_em": "2026-09-03 10:00:00"
}
```

### 3.2 Bearer JWT

```bash
curl -X POST http://172.16.12.36:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"sua-senha"}'
```

Retorno esperado:

```json
{
  "success": true,
  "token_type": "Bearer",
  "access_token": "<jwt>",
  "expires_in": 43200,
  "usuario": "admin",
  "admin": 1
}
```

### 3.3 Refresh de JWT

```bash
curl -X POST http://172.16.12.36:8000/api/auth/refresh \
  -H "Authorization: Bearer <jwt>"
```

### 3.4 Uso nas requisições

```bash
curl http://172.16.12.36:8000/api/status \
  -H "Authorization: Bearer <jwt>"
```

Para endpoints legados protegidos por sessão, continue usando:

```bash
curl http://172.16.12.36:8000/api/sync?token=<session_token>
```

---

## 4. Chaves e Tokens

- **Session token:** gerado no login local (`/api/auth/login`). Validade definida por `expira_em`.
- **JWT:** gerado em `/api/auth/token`. Validade padrão de 12h, configurável via `JWT_EXPIRES_IN` no backend.
- **API Key:** existente para rota `/api/sync`. Mantenha-a apenas para integrações legadas sem suporte a Bearer.
- Nunca compartilhe senhas por canal inseguro. Tokens devem ser armazenados em cofre/keychain quando necessário.

---

## 5. Considerações

- Rotas públicas legadas continuam válidas em `127.0.0.1` sem token.
- Para acesso externo estável, utilize `http://<IP_DO_SERVIDOR>:8000`.
- Em caso de falha, valide:
  - `/health`
  - `/api/status`
  - `/api/sync/health`
