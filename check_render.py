import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Locate where the frotaCC (or codigo + descricao) is rendered
# It's in renderTeamTabContent:
# `<td>${eq.codigo}</td>` or similar? Let's check.
# The table row has:
# `<td><strong>${eq.codigo}</strong></td>`
# `<td>${eq.descricao}</td>`

# Wait, let me check exactly how it renders the table cells.
