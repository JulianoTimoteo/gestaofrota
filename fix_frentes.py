import re
with open('Servidor-Banco/app.py', 'r', encoding='utf-8') as f:
    text = f.read()
text = re.sub(r"'grupo': 'FRENTE \d+'", "'grupo': 'COLHEDORA'", text)
with open('Servidor-Banco/app.py', 'w', encoding='utf-8') as f:
    f.write(text)
