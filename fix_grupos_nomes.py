# -*- coding: utf-8 -*-
import json
import re

with open('Servidor-Banco/app.py', 'r', encoding='utf-8') as f:
    app_text = f.read()

# Update the mappings to use the full descriptive names
mappings = {
    'CAMINHÃO APOIO': ['31815', '31915', '311015'],
    'CAMINHÃO BOMBEIRO': ['31917', '311017', '31216', '31116', '31417', '38113'],
    'CAMINHÃO BASCULANTE': ['687', '689', '32117', '32217', '31317', '31120'],
    'FRENTE': ['672', '38310', '674', '38121', '38221', '38210', '38120', '38220'],
    'PRANCHA': ['31220', '31320', '31420', '42213', '42113', '42313'],
    'CAMINHÃO PIPA/VINHAÇA': ['31717', '31617', '31319', '311117', '311217', '311317', '311417', '311517']
}

for novo_grupo, frotas in mappings.items():
    for f in frotas:
        app_text = re.sub(
            r"'" + f + r"': \{'tipo': '([^']+)', 'grupo': '(?:CACAMBA|BOMBEIRO|APOIO|PRANCHA|VINHACA|FRENTE|CAMINHOES|OUTROS)'\}", 
            r"'" + f + r"': {'tipo': '\1', 'grupo': '" + novo_grupo + r"'}", 
            app_text
        )

with open('Servidor-Banco/app.py', 'w', encoding='utf-8') as f:
    f.write(app_text)

with open('Appweb/dados.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for eq in data['data']['equipamentos']:
    cod = eq['codigo']
    for novo_grupo, frotas in mappings.items():
        if cod in frotas:
            eq['grupo'] = novo_grupo

with open('Appweb/dados.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Updated descriptive groups!')
