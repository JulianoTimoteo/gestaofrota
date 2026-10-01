import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add window.promptMoveToEquipe in the global scripts
js_func = """
        window.promptMoveToEquipe = function(cod) {
            const eq = equipments.find(e => String(e.codigo) === String(cod));
            if (!eq) return;
            const nova = prompt('Digite o nome da Equipe para o equipamento ' + cod + ':\\n(Ex: CAMINHOES, COLHEDORA, PREPARO, APOIO, etc)');
            if (nova && nova.trim() !== '') {
                const uppercaseNova = nova.trim().toUpperCase();
                setCustomEquipGroup(cod, uppercaseNova);
                
                // Update in-memory
                eq.grupo = uppercaseNova;
                
                addLog(`Equipamento ${cod} movido para ${uppercaseNova}`, 'success');
                renderEquipamentos();
                renderTeamTabs(false);
                atualizarStatusGeral();
            }
        };
"""

# Insert it before window.selectTeam
target = r"(window\.selectTeam = function\(targetTeam\) \{)"
html = re.sub(target, js_func + r"\n        \1", html)


# 2. Modify renderTeamTabContent row rendering to add the + button
pattern_row = r"(const tdOperacao = omitirOperacao \? '' : `<td><span class=\"badge-equip \nos-fechada\">[^<]+</span></td>`;\s*return `<tr>\s*<td><strong>\$\{eq\.codigo \|\| '-'\}</strong></td>)"

# We need to find exactly:
# const tdOperacao = omitirOperacao ? '' : `<td><span class="badge-equip os-fechada">${opText}</span></td>`;
# return `<tr>
# <td><strong>${eq.codigo || '-'}</strong></td>

import re

# Let's do a more robust regex
row_regex = re.compile(r"(return\s*`<tr>\s*)<td><strong>\$\{eq\.codigo \|\| '-'\}</strong></td>", re.MULTILINE)
repl = r"\1<td><div style=\"display:flex;align-items:center;gap:6px;\"><strong>${eq.codigo || '-'}</strong> ${teamUpper === 'OUTROS' ? `<button onclick=\"promptMoveToEquipe('${eq.codigo}')\" title=\"Mover para uma Equipe\" style=\"padding:2px 6px; font-size:10px; background:var(--color-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-plus\"></i></button>` : ''}</div></td>"
html = row_regex.sub(repl, html)

# Let's ensure the match worked.
if 'promptMoveToEquipe' in html:
    print("Script injected successfully!")
else:
    print("Error: Could not inject script!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
