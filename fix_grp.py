# encoding=utf8
import re, json

mappings = {
    'CAMINHÃO APOIO': ['31815', '31915', '311015'],
    'CAMINHÃO BOMBEIRO': ['31917', '311017', '31216', '31116', '31417', '38113'],
    'CAMINHÃO BASCULANTE': ['687', '689', '32117', '32217', '31317', '31120'],
    'FRENTE': ['672', '38310', '674', '38121', '38221', '38210', '38120', '38220'],
    'PRANCHA': ['31220', '31320', '31420', '42213', '42113', '42313'],
    'CAMINHÃO PIPA/VINHAÇA': ['31717', '31617', '31319', '311117', '311217', '311317', '311417', '311517']
}

with open('Appweb/dados.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for eq in data['data']['equipamentos']:
    for k, v in mappings.items():
        if eq['codigo'] in v:
            eq['grupo'] = k

with open('Appweb/dados.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open('Servidor-Banco/app.py', 'r', encoding='utf-8') as f:
    text = f.read()

for k, v in mappings.items():
    for cod in v:
        pattern = r"'" + cod + r"': \{'tipo': '([^']+)', 'grupo': '[^']+'\}"
        repl = r"'" + cod + r"': {'tipo': '\1', 'grupo': '" + k + r"'}"
        text = re.sub(pattern, repl, text)

with open('Servidor-Banco/app.py', 'w', encoding='utf-8') as f:
    f.write(text)
