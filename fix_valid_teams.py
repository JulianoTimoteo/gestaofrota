import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('app.py', 'r', encoding='utf-8') as f:
    app = f.read()

if 'Caminh\u00e3o Canavieiro' in app:
    print("OK app.py: encoding correto")
else:
    print("PROBLEMA app.py: encoding incorreto")

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 2a. Expandir VALID_TEAMS
old_valid = "const VALID_TEAMS = ['BIOMASSA', 'CAMINHOES', 'COLHEDORA', 'FERTIRRIGACAO', 'HERBICIDA', 'LINHA AMARELA', 'PREPARO', 'TRATOS CULTURAIS'];"
new_valid = "const VALID_TEAMS = ['BIOMASSA', 'CAMINHOES', 'CAMINHOES TERCEIROS', 'COLHEDORA', 'FERTIRRIGACAO', 'HERBICIDA', 'LINHA AMARELA', 'OUTROS', 'PREPARO', 'TORRES SOLINFNET', 'TRATOS CULTURAIS'];"
if old_valid in html:
    html = html.replace(old_valid, new_valid)
    print("OK VALID_TEAMS expandido")
else:
    print("WARN VALID_TEAMS nao encontrado - tentando regex")
    html = re.sub(r"const VALID_TEAMS = \[.*?\];", new_valid, html)
    print("OK VALID_TEAMS via regex")

# 2b. Corrigir finalGroup
old_final = "const finalGroup = VALID_TEAMS.includes(assignedGroup) ? assignedGroup : (VALID_TEAMS.includes(rawGrp) ? rawGrp : 'PREPARO');"
new_final = "const finalGroup = VALID_TEAMS.includes(assignedGroup) ? assignedGroup : (VALID_TEAMS.includes(rawGrp) ? rawGrp : (rawGrp || assignedGroup || 'OUTROS'));"
if old_final in html:
    html = html.replace(old_final, new_final)
    print("OK finalGroup corrigido")
else:
    print("ERRO finalGroup nao encontrado")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Correcoes aplicadas!")
