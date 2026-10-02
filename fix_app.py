with open('Servidor-Banco/app.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("'31815': {'tipo': 'Caminhão Apoio', 'grupo': 'CAMINHÃO APOIO'}", "'31815': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'}")
text = text.replace("'311015': {'tipo': 'Caminhão Apoio', 'grupo': 'CAMINHÃO APOIO'}", "'311015': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'}")
text = text.replace("'31915': {'tipo': 'Caminhão Apoio', 'grupo': 'CAMINHÃO APOIO'}", "'31915': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'}")

with open('Servidor-Banco/app.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('app.py updated')
