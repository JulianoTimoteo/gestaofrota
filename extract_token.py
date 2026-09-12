import sys, re, requests, urllib3
urllib3.disable_warnings()
sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import BASE_URL, USERNAME, PASSWORD

session = requests.Session()
session.verify = False
resp = session.post(BASE_URL + '/Login/AuthenticateUser', data={'UserName': USERNAME, 'Password': PASSWORD}, timeout=10)
text = resp.text

# Extrai limitedGuid do HTML
matches = re.findall(r'limitedGuid\s*=\s*["\']([^"\']*)["\']', text)
print('limitedGuid values:', matches)

# UUIDs no HTML
uuids = re.findall(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', text)
print('UUIDs found:', uuids[:5])
