"""Testa GetWidgetValue com o painel 174 e widget 1565 para OS."""
import sys, json, requests, urllib3
urllib3.disable_warnings()
sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import SyncService, BASE_URL

s = SyncService()
s.login()
session = s.session

import datetime
ref_date = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

# Testa GetWidgetValue com painel 174 e widget 1565
for method in ['POST', 'GET']:
    for params in [
        {'UserPanelId': 174, 'ReferenceDate': ref_date, 'Widgets': 1565},
        {'userPanelId': 174, 'referenceDate': ref_date, 'widgets': 1565},
        {'UserPanelId': 174, 'ReferenceDate': ref_date, 'Widgets': '1565'},
    ]:
        try:
            if method == 'POST':
                resp = session.post(f'{BASE_URL}/Home/GetWidgetValue', data=params, timeout=15)
            else:
                resp = session.get(f'{BASE_URL}/Home/GetWidgetValue', params=params, timeout=15)
            
            js = resp.json()
            displays = js.get('Displays', [])
            charts = js.get('Charts', [])
            maps = js.get('Maps', [])
            
            if displays or charts:
                print(f'[{method}] {params} -> displays={len(displays)}, charts={len(charts)}')
                if displays:
                    print(f'  Sample display: {json.dumps(displays[0], default=str)[:200]}')
        except Exception as e:
            pass

# Tenta também o endpoint da API interna
print('\n--- Tentativas via api-simplefarm :8050 ---')
for ep in [
    '/api/PanelObject/GetWidgetList?userPanelId=174&widgets=1565&records=300',
]:
    try:
        resp = session.get(f'https://simplefarm.usinapitangueiras.com.br:8050{ep}', timeout=10)
        print(f'8050{ep}: {resp.status_code} - {resp.text[:100]}')
    except Exception as e:
        print(f'8050{ep}: ERROR {e}')
