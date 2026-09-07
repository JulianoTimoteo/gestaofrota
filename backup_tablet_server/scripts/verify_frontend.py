#!/usr/bin/env python3
"""Verify frontend serving and API access."""
import requests
import urllib3
urllib3.disable_warnings()

# Testa se o frontend esta sendo servido
r = requests.get('http://172.16.12.36:8000/', timeout=5)
print(f'Frontend servido: {r.status_code}')
has_html = '<html' in r.text.lower()
print(f'Contem HTML: {has_html}')

# Testa API
r2 = requests.get('http://172.16.12.36:8000/api/status', timeout=5)
print(f'API Status: {r2.status_code}')
data = r2.json()
print(f'  OS Abertas: {data["data"]["osAbertas"]}')
print(f'  Ultima Sync: {data["data"]["ultimaSincronizacao"]}')
print()

# Verifica se window.location.origin funcionaria
print('=== COMO FUNCIONA ===')
print('Quando acessa http://172.16.12.36:8000:')
print('  window.location.origin = http://172.16.12.36:8000')
print('  API_BASE = mesmo valor')
print('  Todas as chamadas API vao para o mesmo servidor')
print()
print('Se o IP mudar para 192.168.1.100:')
print('  Usuario acessa http://192.168.1.100:8000')
print('  window.location.origin = http://192.168.1.100:8000')
print('  API_BASE muda automaticamente!')
