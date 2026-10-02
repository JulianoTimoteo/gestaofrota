with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# We will just replace "const finalGroup = VALID_TEAMS.includes(assignedGroup)..." with "const finalGroup = assignedGroup;"
text = re.sub(r'const finalGroup = VALID_TEAMS\.includes\(assignedGroup\) \? assignedGroup : \(VALID_TEAMS\.includes\(rawGrp\) \? rawGrp : \(rawGrp \|\| assignedGroup \|\| \'OUTROS\'\)\);', 'const finalGroup = assignedGroup;', text)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Logic replaced')
