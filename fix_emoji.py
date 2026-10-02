import os

replacements = {
    b'OS\xc3\xb0\xc5\xb8\xe2\x80\x9c\xe2\x80\xb9'.decode('utf-8'): b'OS\xf0\x9f\x93\x8b'.decode('utf-8'),
    b'OK\xc3\xa2\xc5\x93\xe2\x80\xa6'.decode('utf-8'): b'OK\xe2\x9c\x85'.decode('utf-8'),
    b'c/OS\xc3\xb0\xc5\xb8\xe2\x80\x9c\xe2\x80\xb9'.decode('utf-8'): b'c/OS\xf0\x9f\x93\x8b'.decode('utf-8'),
    b'24h\xc3\xa2\xc5\xa1'.decode('utf-8'): b'24h\xe2\x9a\xa0\xef\xb8\x8f'.decode('utf-8'),
    b'OS\xf0\x9f\x93\x8b'.decode('cp1252'): b'OS\xf0\x9f\x93\x8b'.decode('utf-8'),
    b'OK\xe2\x9c\x85'.decode('cp1252'): b'OK\xe2\x9c\x85'.decode('utf-8'),
    b'c/OS\xf0\x9f\x93\x8b'.decode('cp1252'): b'c/OS\xf0\x9f\x93\x8b'.decode('utf-8'),
    b'\xe2\x9a\x99\xef\xb8\x8f'.decode('cp1252'): b'\xe2\x9a\x99\xef\xb8\x8f'.decode('utf-8'),
    b'\xe2\x9c\x8f\xef\xb8\x8f'.decode('cp1252'): b'\xe2\x9c\x8f\xef\xb8\x8f'.decode('utf-8'),
    b'\xf0\x9f\x97\x91\xef\xb8\x8f'.decode('cp1252'): b'\xf0\x9f\x97\x91\xef\xb8\x8f'.decode('utf-8'),
    b'24h\xe2\x9a\xa0\xef\xb8\x8f'.decode('cp1252'): b'24h\xe2\x9a\xa0\xef\xb8\x8f'.decode('utf-8')
}

for filepath in ['Appweb/index.html', 'Appweb/dados.json']:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    for bad, good in replacements.items():
        text = text.replace(bad, good)

    # Some html entities
    text = text.replace('24hâš&nbsp;ï¸', '24h??')
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print('Done replacing emojis.')
