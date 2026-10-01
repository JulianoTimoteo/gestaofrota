import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's use regex that handles \r\n and \n
html = re.sub(r"const nova = prompt\('Digite o nome da Equipe para o equipamento ' \+ cod \+ ':\r?\n\(Ex:",
              r"const nova = prompt('Digite o nome da Equipe para o equipamento ' + cod + ':\\n(Ex:",
              html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
