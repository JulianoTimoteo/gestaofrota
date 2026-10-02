with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx1 = text.find("const VALID_TEAMS = ['BIOMASSA', 'CAMINHOES', 'CAMINHOES")
idx2 = text.find("localStorage.setItem('customEquipGroups'", idx1)
idx3 = text.find("}", idx2) + 1

if idx1 != -1 and idx2 != -1:
    text = text[:idx1] + "/* Pruning removed */\n" + text[idx3:]
    with open('Appweb/index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Removed by index!')
else:
    print('Not found by index!')
