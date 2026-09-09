import requests
import json
import time
import os

BASE_URL = 'http://localhost:8000'
USERNAME_JULIANO = os.environ.get('SF_USERNAME', '')
PASSWORD_JULIANO = os.environ.get('SF_PASSWORD', '')
USERNAME_RAFAEL = os.environ.get('SF_USERNAME_2', USERNAME_JULIANO)
PASSWORD_RAFAEL = os.environ.get('SF_PASSWORD_2', PASSWORD_JULIANO)

if not USERNAME_JULIANO or not PASSWORD_JULIANO:
    raise SystemExit('Defina SF_USERNAME e SF_PASSWORD via variaveis de ambiente antes de executar este script.')

print("=== INICIANDO TESTE DE MULTI-USUARIOS CONECTADOS ===")

# 1. Login julianotimoteo
r1 = requests.post(f'{BASE_URL}/api/auth/login', json={'usuario': USERNAME_JULIANO, 'senha': PASSWORD_JULIANO})
res1 = r1.json()
print("1. Login julianotimoteo:", res1.get('success'), "User:", res1.get('usuario'))
token1 = res1.get('token')

# 2. Login rafaelfarra
r2 = requests.post(f'{BASE_URL}/api/auth/login', json={'usuario': USERNAME_RAFAEL, 'senha': PASSWORD_RAFAEL})
res2 = r2.json()
print("2. Login rafaelfarra:", res2.get('success'), "User:", res2.get('usuario'))
token2 = res2.get('token')

# 3. Status check com token1
time.sleep(1)
r_status = requests.get(f'{BASE_URL}/api/status', headers={'Authorization': f'Bearer {token1}'})
status_data = r_status.json().get('data', {})

print("\n=== RESPOSTA DO API/STATUS ===")
print("OS Abertas:", status_data.get('osAbertas'))
print("Total Usuarios:", status_data.get('totalUsuarios'))
print("Usuarios Conectados:", status_data.get('usuariosConectados'))

if status_data.get('usuariosConectados') == 2:
    print("\n✅ SUCESSO PERFEITO! O sistema reconheceu AUTOMATICAMENTE que 2 usuarios estao conectados em tempo real!")
else:
    print(f"\n⚠️ ALERTA: Esperado 2 conectados, retornou {status_data.get('usuariosConectados')}")
