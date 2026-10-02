with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
old_logic = """let customGroupsChanged = false;
            Object.keys(customGroups).forEach(k => {
                if (customGroups[k] && !VALID_TEAMS.includes(customGroups[k])) {
                    delete customGroups[k];
                    customGroupsChanged = true;
                }
            });
            if (customGroupsChanged) {
                localStorage.setItem('customEquipGroups', JSON.stringify(customGroups));
            }"""

if old_logic in text:
    text = text.replace(old_logic, "/* Removed aggressive custom group pruning */")
else:
    # try regex just in case spaces differ
    text = re.sub(r'let customGroupsChanged = false;.*?localStorage\.setItem\(\'customEquipGroups\', JSON\.stringify\(customGroups\)\);\s*\}', '/* Removed aggressive custom group pruning */', text, flags=re.DOTALL)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Pruning logic removed')
