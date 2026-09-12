"""
Captura a chamada AJAX que retorna LimitedGuid em JSON após o login completo via Playwright.
"""
import sys, json, time, re
from playwright.sync_api import sync_playwright

sys.path.insert(0, r'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\backend')
from app import BASE_URL, USERNAME, PASSWORD

found_token = None

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(ignore_https_errors=True)
    
    def on_response(res):
        global found_token
        if found_token:
            return
        url = res.url
        # Pula JS/CSS/imagens
        if any(url.endswith(x) for x in ['.js', '.css', '.png', '.woff2', '.ico', '.gif']):
            return
        try:
            body = res.body()
            text = body.decode('utf-8', errors='replace')
            if 'LimitedGuid' in text or '"limited' in text.lower():
                print(f'\n[ENCONTROU] {url}')
                print(f'Body[:400]: {text[:400]}')
                # Extrai o token
                m = re.search(r'"?LimitedGuid"?\s*:\s*"([^"]+)"', text)
                if m:
                    found_token = 'limited ' + m.group(1)
                    print(f'TOKEN: {found_token}')
        except:
            pass
    
    page.on('response', on_response)
    
    page.goto(f'{BASE_URL}/Login', wait_until='networkidle')
    page.fill('input[name="UserName"]', USERNAME)
    page.fill('input[name="Password"]', PASSWORD)
    page.click('button[type="submit"], input[type="submit"]')
    page.wait_for_url('**/#/Home/**', timeout=20000)
    time.sleep(8)
    browser.close()

print(f'\n\nToken final: {found_token}')
