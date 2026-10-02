import json, re
with open('Appweb/dados.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
for eq in data['data']['equipamentos']:
    if eq['grupo'].startswith('FRENTE '):
        eq['grupo'] = 'COLHEDORA'
with open('Appweb/dados.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
