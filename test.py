with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
import re
for m in re.findall(r'<button class="os-info-btn".{0,80}', text):
    print(m.encode('utf-8'))
