"""Testa se o limitedGuid do /Home/Main funciona como token para o :8051."""
import sys, re, json, requests, urllib3, datetime
urllib3.disable_warnings()
sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import SyncService, BASE_URL

s = SyncService()
s.login()
session = s.session

# Extrai limitedGuid do /Home/Main
resp_main = session.get(BASE_URL + '/Home/Main', timeout=15)
guids = re.findall(r"limitedGuid\s*=\s*['\"]([a-f0-9-]{36})['\"]", resp_main.text)
print(f'limitedGuids encontrados: {guids}')

if guids:
    guid = guids[0]
    auth_token = f'limited {guid}'
    print(f'Usando token: {auth_token}')
    
    ref_date = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    url = (f'https://api-simplefarm.usinapitangueiras.com.br:8051'
           f'/api/PanelObject/GetWidgetList'
           f'?userPanelId=174&referenceDate={ref_date}&widgets=1565&records=300')
    
    headers = {
        'Authorization': auth_token,
        'Referer': f'{BASE_URL}/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'pt-BR',
        'Content-Type': 'application/json; charset=utf-8',
    }
    
    resp = requests.get(url, headers=headers, verify=False, timeout=30)
    print(f'Status: {resp.status_code}')
    body = resp.text
    print(f'Body length: {len(body)}')
    print(f'Body[:800]: {body[:800]}')
    
    if resp.status_code == 200:
        try:
            js = resp.json()
            print(f'JSON type: {type(js)}')
            if isinstance(js, dict):
                data = js.get('data', js)
                print(f'Keys: {list(js.keys())}')
            elif isinstance(js, list) and js:
                item = js[0]
                print(f'Item keys: {list(item.keys()) if isinstance(item, dict) else "not dict"}')
                ds = item.get('DataSource', []) if isinstance(item, dict) else []
                print(f'DataSource rows: {len(ds)}')
                if ds:
                    print(f'Sample: {json.dumps(ds[0], default=str, indent=2)[:600]}')
                    print(f'Total rows: {len(ds)}')
        except Exception as e:
            print(f'Parse error: {e}')
