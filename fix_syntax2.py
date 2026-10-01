import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace any literal newline inside the prompt single-quoted string
html = re.sub(r"cod \+ ':\\r?\\n\(Ex:", "cod + '\\\\n(Ex:", html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
