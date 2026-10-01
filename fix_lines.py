with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const nova = prompt" in line:
        # Re-write the line completely
        lines[i] = "            const nova = prompt('Digite o nome da Equipe para o equipamento ' + cod + ':\\\\n(Ex: CAMINHOES, COLHEDORA, PREPARO, APOIO, etc)');\n"
    # Wait, if it was split across two lines, there might be a dangling line!
    if "(Ex: CAMINHOES, COLHEDORA" in line and "const nova =" not in line:
        lines[i] = "" # Delete the dangling line

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
