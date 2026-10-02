with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('content: "â˜€ï¸";', 'content: "☀️";')
text = text.replace('content: "ðŸŒ™";', 'content: "🌙";')

text = text.replace('content: "\xc3\xa2\xcb\x9c\xe2\x82\xac\xef\xb8\x8f";', 'content: "☀️";')
text = text.replace('content: "\xc3\xb0\xc5\xb8\xc5\x92\xe2\x84\xa2";', 'content: "🌙";')

# Any other similar corruption
import re
text = re.sub(r'content: "â˜€.*";', 'content: "☀️";', text)
text = re.sub(r'content: "ðŸŒ™.*";', 'content: "🌙";', text)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Theme emoji fixed.')
