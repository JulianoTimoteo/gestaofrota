import re
import json

with open('Servidor-Banco/app.py', 'r', encoding='utf-8') as f:
    app_text = f.read()

rodotrem = ['31125', '31225', '31325', '31425', '31525', '31625', '31725', '31825', '31925', '311025', '311125', '311225', '311325', '311425', '311525', '311625', '311725', '311825', '311925', '312025']
tremiado = ['31115', '31215', '31315', '31316', '31415', '31515', '31615', '311115', '311215']

for r in rodotrem:
    app_text = re.sub(r"'" + r + r"': \{'tipo': '[^']+', 'grupo': 'CAMINHOES'\}", r"'" + r + r"': {'tipo': 'Rodotrem', 'grupo': 'CAMINHOES'}", app_text)
for t in tremiado:
    app_text = re.sub(r"'" + t + r"': \{'tipo': '[^']+', 'grupo': 'CAMINHOES'\}", r"'" + t + r"': {'tipo': 'Tremiado', 'grupo': 'CAMINHOES'}", app_text)

with open('Servidor-Banco/app.py', 'w', encoding='utf-8') as f:
    f.write(app_text)

with open('Appweb/dados.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
for eq in data['data']['equipamentos']:
    cod = eq['codigo']
    if cod in rodotrem:
        eq['tipo'] = 'Rodotrem'
        eq['grupo'] = 'CAMINHOES'
    elif cod in tremiado:
        eq['tipo'] = 'Tremiado'
        eq['grupo'] = 'CAMINHOES'

with open('Appweb/dados.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
