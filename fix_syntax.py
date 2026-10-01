import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the literal newline inside the JS prompt
html = html.replace("cod + ':\n(Ex:", "cod + ':\\n(Ex:")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed literal newline syntax error in index.html!")
