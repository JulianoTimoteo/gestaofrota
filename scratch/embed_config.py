import json

with open('config/admin_config.json', 'r', encoding='utf-8') as f:
    cfg = json.load(f)

with open('Farra_donuts/Farra/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = 'const EMBEDDED_INITIAL_DATA = {'
replacement = 'const EMBEDDED_INITIAL_DATA = {\n  "adminConfig": ' + json.dumps(cfg, indent=2, ensure_ascii=False) + ',\n'

if target in html and '"adminConfig":' not in html:
    html = html.replace(target, replacement, 1)
    with open('Farra_donuts/Farra/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('EMBEDDED_INITIAL_DATA atualizado com sucesso no index.html!')
else:
    print('Target ja atualizado ou nao encontrado!')
