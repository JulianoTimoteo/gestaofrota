with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'const VALID_TEAMS = \[\'BIOMASSA\'.*?localStorage\.setItem\(\'customEquipGroups\', JSON\.stringify\(customGroups\)\);\s*\}', '/* Aggressive pruning removed */', text, flags=re.DOTALL)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Pruning logic fully removed')
