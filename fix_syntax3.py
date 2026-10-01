import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad_str = "            const nova = prompt('Digite o nome da Equipe para o equipamento ' + cod + ':\n(Ex: CAMINHOES, COLHEDORA, PREPARO, APOIO, etc)');"
good_str = "            const nova = prompt('Digite o nome da Equipe para o equipamento ' + cod + '\\n(Ex: CAMINHOES, COLHEDORA, PREPARO, APOIO, etc)');"

html = html.replace(bad_str, good_str)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
