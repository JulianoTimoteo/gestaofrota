with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Add isAIGuess property
old_logic = """const rawGrp   = (eq.grupo || '').trim();
                let finalGroup = customGroups[codStr];
                
                // Se nao foi movido manualmente, tenta adivinhar com base no padrao de outras frotas!
                if (!finalGroup) {
                    const aiGuess = guessTeamByPattern(desc, mod);
                    if (aiGuess) {
                        finalGroup = aiGuess;
                    } else {
                        finalGroup = rawGrp || 'PREPARO';
                    }
                }"""

new_logic = """const rawGrp   = (eq.grupo || '').trim();
                let finalGroup = customGroups[codStr];
                let isAIGuess = false;
                
                // Se nao foi movido manualmente, tenta adivinhar com base no padrao de outras frotas!
                if (!finalGroup) {
                    const aiGuess = guessTeamByPattern(desc, mod);
                    if (aiGuess) {
                        finalGroup = aiGuess;
                        isAIGuess = true;
                    } else {
                        finalGroup = rawGrp || 'PREPARO';
                    }
                }"""
text = text.replace(old_logic, new_logic)

# Return isAIGuess
old_return = """codOS:     eq.codOS     || ''
                };"""
new_return = """codOS:     eq.codOS     || '',
                    isAIGuess: isAIGuess
                };"""
text = text.replace(old_return, new_return)

# Update HTML generation for standard tabs
old_html1 = "<td><div style=\"display:flex;align-items:center;gap:6px;\"><strong>${eq.codigo || '-'}</strong> ${teamUpper === 'OUTROS' ? `<button onclick=\"promptMoveToEquipe('${eq.codigo}')\" title=\"Mover para uma Equipe\" style=\"padding:2px 6px; font-size:10px; background:var(--color-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-plus\"></i></button>` : ''}</div></td>"
new_html1 = "<td><div style=\"display:flex;align-items:center;gap:6px;\"><strong>${eq.codigo || '-'}</strong> <button onclick=\"promptMoveToEquipe('${eq.codigo}')\" title=\"Mover para uma Equipe\" style=\"padding:2px 6px; font-size:10px; background:var(--color-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-plus\"></i></button> ${eq.isAIGuess ? `<button onclick=\"confirmAIGuess('${eq.codigo}', '${eq.grupo}')\" title=\"Confirmar sugestão da IA\" style=\"padding:2px 6px; font-size:10px; background:#22c55e; color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-check\"></i></button>` : ''}</div></td>"

text = text.replace(old_html1, new_html1)

# Add confirmAIGuess function
js_func = """
        window.confirmAIGuess = function(cod, grupo) {
            setCustomEquipGroup(cod, grupo);
            const eq = equipments.find(e => String(e.codigo) === String(cod));
            if (eq) {
                eq.isAIGuess = false;
                addLog(`Sugestão confirmada: Frota ${cod} fixada na equipe ${grupo}`, 'success');
                renderEquipamentos();
            }
        };
        window.promptMoveToEquipe = function(cod) {"""

text = text.replace("window.promptMoveToEquipe = function(cod) {", js_func)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated AI buttons logic')
