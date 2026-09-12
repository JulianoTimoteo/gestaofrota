"""Verifica se o limitedGuid está preenchido no HTML do painel de OS."""
import sys, re, requests, urllib3
urllib3.disable_warnings()
sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import SyncService, BASE_URL

s = SyncService()
s.login()
session = s.session

# Tenta acessar diretamente a página do painel de OS
panels_to_try = [
    '/',
    '/Home',
    '/Home/Main',
    '/Home/Panel/174',
]

for panel in panels_to_try:
    resp = session.get(BASE_URL + panel, timeout=15)
    text = resp.text
    # Procura limitedGuid não-vazio
    matches = re.findall(r'limitedGuid\s*=\s*["\']([^"\']+)["\']', text)
    non_empty = [m for m in matches if m.strip()]
    if non_empty:
        print(f'{panel}: FOUND! limitedGuid = {non_empty}')
    else:
        # Verifica se a variável existe mas vazia
        has_var = 'limitedGuid' in text
        print(f'{panel}: limitedGuid presente={has_var}, valores={matches}')

# Tenta o endpoint que o JS chama para obter dados do painel
print('\n--- Tentando endpoints de painel ---')
panel_endpoints = [
    '/Admin/UserPanel/GetUserPanelDetails/174',
    '/Home/GetPanelData/174',
    '/Admin/UserPanel/GetPanel/174',
]
for ep in panel_endpoints:
    try:
        resp = session.get(BASE_URL + ep, timeout=10)
        if resp.status_code == 200 and len(resp.text) > 10:
            print(f'{ep}: {resp.status_code} - {resp.text[:200]}')
    except Exception as e:
        print(f'{ep}: ERROR {e}')
