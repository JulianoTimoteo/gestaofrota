"""Extrai DataSource do response JSON da API."""
import sys, re, json, requests, urllib3, datetime
urllib3.disable_warnings()
sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import SyncService, BASE_URL

s = SyncService()
s.login()
resp_main = s.session.get(BASE_URL + '/Home/Main', timeout=15)
guids = re.findall(r"limitedGuid\s*=\s*['\"]([a-f0-9-]{36})['\"]", resp_main.text)
guid = guids[0]
auth_token = f'limited {guid}'

ref_date = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
url = (f'https://api-simplefarm.usinapitangueiras.com.br:8051'
       f'/api/PanelObject/GetWidgetList'
       f'?userPanelId=174&referenceDate={ref_date}&widgets=1565&records=300')
headers = {
    'Authorization': auth_token,
    'Referer': f'{BASE_URL}/',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
}
resp = requests.get(url, headers=headers, verify=False, timeout=30)
js = resp.json()

data = js.get('data', [])
print(f'data items: {len(data)}')
if data:
    item = data[0]
    print(f'item keys: {list(item.keys())}')
    ds = item.get('DataSource', [])
    print(f'DataSource rows: {len(ds)}')
    if ds:
        print(f'\nAmostra de OS:')
        print(json.dumps(ds[0], default=str, indent=2))
        print(f'\nCampos disponíveis: {list(ds[0].keys())}')
