# SimpleFarm Integration - API Documentation

## Visao Geral

Sistema de integracao com o SimpleFarm da Usina Pitangueiras. Fornece uma API REST para acesso aos dados de OS, equipamentos, operacoes e metricas.

**Base URL:** `http://<IP_DO_SERVIDOR>:8000`

## Acesso Rapido

```bash
# Status do servidor
curl http://172.16.12.36:8000/api/status

# Listar OS
curl http://172.16.12.36:8000/api/os

# Listar equipamentos
curl http://172.16.12.36:8000/api/equipamentos

# Listar operacoes
curl http://172.16.12.36:8000/api/operacoes
```

## Endpoints da API

### Endpoints Publicos (sem autenticacao)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/status` | Status geral do sistema |
| GET | `/api/os` | Lista todas as Ordens de Servico |
| GET | `/api/equipamentos` | Lista equipamentos com status de OS |
| GET | `/api/operacoes` | Lista operacoes |
| GET | `/api/coa` | Lista viagens COA |
| GET | `/api/tables` | Lista tabelas disponiveis |
| GET | `/api/tables/{name}` | Dados de uma tabela especifica |
| GET | `/api/export` | Exporta dados (json/csv) |
| GET | `/api/system` | Informacoes do sistema (CPU, memoria, disco, rede) |

### Endpoints Protegidos (requerem API Key)

| Metodo | Endpoint | Descricao | Header |
|--------|----------|-----------|--------|
| POST | `/api/sync` | Executa sincronizacao manual | `X-API-Key: <chave>` |

**Nota:** O acesso local (127.0.0.1) nao requer API Key.

## Exemplos de Uso

### JavaScript (Frontend)

```javascript
// Configuracao automatica
const API_BASE = window.location.origin;

// Buscar status
const r = await fetch(`${API_BASE}/api/status`);
const data = await r.json();
console.log(data.data.osAbertas);

// Buscar OS
const os = await fetch(`${API_BASE}/api/os`);
const osData = await os.json();
console.log(osData.data);

// Buscar equipamentos
const eq = await fetch(`${API_BASE}/api/equipamentos`);
const eqData = await eq.json();
console.log(eqData.data);

// Buscar operacoes
const op = await fetch(`${API_BASE}/api/operacoes`);
const opData = await op.json();
console.log(opData.data);

// Buscar tabela especifica
const tabela = await fetch(`${API_BASE}/api/tables/ordens_servico`);
const tabelaData = await tabela.json();
console.log(tabelaData.data);

// Exportar para CSV
window.open(`${API_BASE}/api/export?format=csv&table=ordens_servico`);
```

### Python

```python
import requests

API_BASE = 'http://172.16.12.36:8000'

# Status
r = requests.get(f'{API_BASE}/api/status')
print(r.json())

# OS
r = requests.get(f'{API_BASE}/api/os')
for os in r.json()['data']:
    print(f"{os['codOS']} - {os['statusOS']}")

# Equipamentos
r = requests.get(f'{API_BASE}/api/equipamentos')
for eq in r.json()['data']:
    print(f"{eq['Código']} - {eq['Descrição']}")

# Tabelas disponiveis
r = requests.get(f'{API_BASE}/api/tables')
print(r.json()['data'])
```

### cURL

```bash
# Status
curl http://172.16.12.36:8000/api/status

# OS em JSON
curl http://172.16.12.36:8000/api/os | jq '.data[] | {codOS, statusOS}'

# Equipamentos em CSV
curl http://172.16.12.36:8000/api/export?format=csv&table=equipamentos

# Tabelas disponiveis
curl http://172.16.12.36:8000/api/tables

# Dados de uma tabela
curl http://172.16.12.36:8000/api/tables/ordens_servico

# Sincronizar (requer API Key)
curl -X POST -H "X-API-Key: sua-chave" http://172.16.12.36:8000/api/sync
```

## Estrutura das Respostas

### Status (`/api/status`)

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
    "tabelasBanco": ["ordens_servico", "equipamentos", ...],
    "syncRunning": true
  }
}
```

### OS (`/api/os`)

```json
{
  "success": true,
  "total": 67,
  "data": [
    {
      "tipoOS": "NORMAL",
      "subClasse": "1/7 - TRATOR DE PNEUS",
      "codigoEquip": "533",
      "frotaCC": "533 - BH-180",
      "codOS": "764.578",
      "statusOS": "ABERTA",
      "tipoOficina": "CAMPO",
      "oficina": "178 - MANUT. CAMPO",
      "dataEntrada": "31/08/2026",
      "dataPrevisao": "",
      "diasPermanencia": "0,8",
      "descricao": "SOCORRO - ...",
      "dataSincronizacao": "2026-09-01 09:30:00"
    }
  ]
}
```

### Equipamentos (`/api/equipamentos`)

```json
{
  "success": true,
  "total": 64,
  "data": [
    {
      "Código": "11216",
      "codigo": "11216",
      "Descrição": "TRATOR NEW HOLLAND T7.245",
      "descricao": "TRATOR NEW HOLLAND T7.245",
      "Modelo": "NEW HOLLAND T7 240",
      "modelo": "NEW HOLLAND T7 240",
      "Tipo": "TRATOR DE PNEUS LEVES MAG100R",
      "tipo": "TRATOR DE PNEUS LEVES MAG100R",
      "Grupo": "BIOMASSA",
      "grupo": "BIOMASSA",
      "statusOS": "Com OS",
      "codOS": "764.578"
    }
  ]
}
```

### Operacoes (`/api/operacoes`)

```json
{
  "success": true,
  "total": 242,
  "data": [
    {
      "Código": "3025",
      "codigo": "3025",
      "Descrição": "Manutencao Eletrica",
      "descricao": "Manutencao Eletrica",
      "Tipo de Operacao": "MANUTENÇÃO",
      "Corporativo": "PITANGUEIRAS",
      "Grupo de Operacao": "Manutenção",
      "Tempo de Operacao": "ILIMITADO",
      "Estado": "PARADA",
      "Status": "ATIVO",
      "status": "ATIVO"
    }
  ]
}
```

### System Info (`/api/system`)

```json
{
  "success": true,
  "data": {
    "servidor": {
      "hostname": "DESKTOP-XXX",
      "ip": "172.16.12.36",
      "so": "Windows 10",
      "uptime": "2h 30min",
      "python": "3.11.0"
    },
    "cpu": { "percent": 15, "cores": 8 },
    "memoria": { "total_gb": 16, "usada_gb": 8.5, "percent": 53 },
    "disco": { "total_gb": 500, "usado_gb": 200, "percent": 40 },
    "banco": {
      "tamanho_mb": 0.5,
      "tabelas": [
        {"nome": "ordens_servico", "registros": 67},
        {"nome": "equipamentos", "registros": 64}
      ],
      "total_tabelas": 19
    },
    "sync": {
      "running": true,
      "intervalo_segundos": 30,
      "ciclos": 150,
      "erros": 3
    }
  }
}
```

## Tabelas Disponiveis

| Tabela | Descricao | Registros |
|--------|-----------|-----------|
| `ordens_servico` | Ordens de Servico | ~67 |
| `equipamentos` | Cadastro de equipamentos | 64 |
| `operacoes` | Operacoes da usina | 242 |
| `painel_metricas` | Metricas dos paineis | Variavel |
| `sincronizacao_log` | Log de sincronizacao | Variavel |
| `BH_Report` | Dados do BH Report | 1 |
| `Logistica` | Dados de logistica | 1 |
| `Producao` | Dados de producao | 1 |
| `coa_resumo` | Resumo COA | 1 |
| `disponibilidade` | Metricas de disponibilidade | 4 |
| `entrada_cana_dia` | Entrada de cana/dia | 13 |

## Monitor do Sistema

Acesse `http://<IP>:8000/monitor` para ver:
- Status do servidor
- Uso de CPU
- Memoria RAM
- Uso de Disco
- Conexao de rede (IP)
- Tabelas disponiveis com contagem
- Status da sincronizacao

## Seguranca

- Credenciais do SimpleFarm sao armazenadas **apenas no backend**
- Nunca sao expostas ao frontend ou ao usuario final
- O login e feito automaticamente pelo sistema
- API Key necessaria apenas para operacoes administrativas (sync manual)
- Acesso local (127.0.0.1) nao requer API Key

## Sincronizacao

- **Automatica**: A cada 30 segundos (configuravel)
- **Manual**: Via endpoint `/api/sync` (requer API Key)
- Dados sao atualizados em tempo real no banco SQLite

## Problemas Comuns

| Problema | Solucao |
|----------|---------|
| Erro de CORS | O backend ja tem CORS habilitado |
| API Key invalida | Use o header `X-API-Key` ou acesso local |
| Dados desatualizados | Aguarde 30s ou faca sync manual |
| Erro de conexao | Verifique se o servidor esta rodando |

---

*Documento gerado em 01/09/2026*
*Sistema: SimpleFarm Integration - Usina Pitangueiras*
