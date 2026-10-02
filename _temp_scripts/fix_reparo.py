import re

with open('app.py', 'r', encoding='utf-8') as f:
    app_code = f.read()

# Find and replace the line that excludes REPARO
# 'if tp_of == 'EXTERNA' or 'REPARO' in tp_os:'
# We should only exclude 'EXTERNA' now
old_line = "if tp_of == 'EXTERNA' or 'REPARO' in tp_os:"
new_line = "if tp_of == 'EXTERNA':"
app_code = app_code.replace(old_line, new_line)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Removed REPARO exclusion!")
