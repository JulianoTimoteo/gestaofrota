#!/usr/bin/env python3
"""Verify API endpoints."""
import requests
import urllib3
urllib3.disable_warnings()

print('=== VERIFICACAO DA API ===')
print()

# Status
r = requests.get('http://localhost:8000/api/status', timeout=5)
data = r.json()
print(f'/api/status: {data["data"]["status"]}')
print(f'  totalOS: {data["data"]["totalOS"]}')
print(f'  osAbertas: {data["data"]["osAbertas"]}')
print(f'  ultimaSincronizacao: {data["data"]["ultimaSincronizacao"]}')
print()

# OS
r2 = requests.get('http://localhost:8000/api/os', timeout=5)
os_data = r2.json()
print(f'/api/os: {os_data["total"]} registros')
if os_data['data']:
    print(f'  Primeiro: {os_data["data"][0]["codOS"]}')
print()

# Equipamentos
r3 = requests.get('http://localhost:8000/api/equipamentos', timeout=5)
eq_data = r3.json()
print(f'/api/equipamentos: {eq_data["total"]} registros')
print()

# Operacoes
r4 = requests.get('http://localhost:8000/api/operacoes', timeout=5)
op_data = r4.json()
print(f'/api/operacoes: {op_data["total"]} registros')
print()

# Sync manual
print('Executando sync manual...')
r5 = requests.post('http://localhost:8000/api/sync', timeout=180)
sync_data = r5.json()
print(f'/api/sync: success={sync_data.get("success")}')
if sync_data.get('message'):
    print(f'  message: {sync_data["message"]}')
