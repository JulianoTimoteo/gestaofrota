#!/usr/bin/env python3
"""API Network Access Documentation."""
import requests
import urllib3
import socket
from pathlib import Path

urllib3.disable_warnings()

def get_local_ip():
    """Get the local network IP."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

ip = get_local_ip()

doc = f"""# API SimpleFarm Integration - Acesso via Rede

## Endereços de Acesso

| Dispositivo | URL |
|-------------|-----|
| **Computador (local)** | http://localhost:8000 |
| **Tablet/Outros dispositivos** | http://{ip}:8000 |

## Endpoints da API

Todos os endpoints estão disponíveis via rede:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/status | Status do sistema |
| GET/POST | /api/sync | Executar sincronização |
| GET | /api/os | Listar OS |
| GET | /api/equipamentos | Listar equipamentos |
| GET | /api/operacoes | Listar operações |
| GET | /api/coa | Listar viagens COA |
| GET | /api/tables | Listar tabelas |
| GET | /api/tables/{{name}} | Dados de uma tabela |
| GET | /api/export | Exportar dados |

## Exemplos de Uso (JavaScript)

```javascript
// Configuração da API
const API_BASE = 'http://{ip}:8000';

// Buscar status
fetch(`${{API_BASE}}/api/status`)
    .then(r => r.json())
    .then(data => console.log(data));

// Buscar OS
fetch(`${{API_BASE}}/api/os`)
    .then(r => r.json())
    .then(data => console.log(data.data));

// Sincronizar
fetch(`${{API_BASE}}/api/sync`, {{ method: 'POST' }})
    .then(r => r.json())
    .then(data => console.log(data));
```

## Exemplos de Uso (Python)

```python
import requests

API_BASE = 'http://{ip}:8000'

# Status
r = requests.get(f'{{API_BASE}}/api/status')
print(r.json())

# OS
r = requests.get(f'{{API_BASE}}/api/os')
print(r.json()['data'])
```

## Configuração do Firewall

Se o acesso não funcionar, libere a porta 8000 no Windows Firewall:

```powershell
netsh advfirewall firewall add rule name="SimpleFarm API" dir=in action=allow protocol=TCP localport=8000
```

## Sincronização Contínua

O sistema está configurado para sincronizar automaticamente a cada 30 segundos.
Os dados são atualizados em tempo real no banco SQLite e refletidos na API.

---

*Documento gerado automaticamente em 01/09/2026*
"""

Path('API_NETWORK.md').write_text(doc, encoding='utf-8')
print(f"API_NETWORK.md criado com IP: {ip}")
print(f"Acesso via rede: http://{ip}:8000")
