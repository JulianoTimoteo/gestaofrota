import re

with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

ai_logic = """
            // ====== INTELIGÊNCIA: APRENDIZADO DE PADRÕES (MEMÓRIA) ======
            const patternMemory = {};
            for (const cod of Object.keys(customGroups)) {
                const team = customGroups[cod];
                if (uniqueEquips.has(cod)) {
                    const refEq = uniqueEquips.get(cod);
                    const descWords = (refEq.descricao || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4);
                    const modWords = (refEq.modelo || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4);
                    const allWords = [...descWords, ...modWords];
                    if (!patternMemory[team]) patternMemory[team] = {};
                    allWords.forEach(w => {
                        // Ignorar palavras muito genéricas se precisar
                        if (w !== 'PARA' && w !== 'COM') {
                            patternMemory[team][w] = (patternMemory[team][w] || 0) + 1;
                        }
                    });
                }
            }

            function guessTeamByPattern(desc, mod) {
                const descWords = (desc || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4);
                const modWords = (mod || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4);
                const allWords = [...descWords, ...modWords];
                if (allWords.length === 0) return null;
                
                let bestTeam = null;
                let maxScore = 0;
                for (const team in patternMemory) {
                    let score = 0;
                    allWords.forEach(w => {
                        if (patternMemory[team][w]) score += patternMemory[team][w];
                    });
                    if (score > maxScore && score > 0) {
                        maxScore = score;
                        bestTeam = team;
                    }
                }
                return bestTeam;
            }
            // ============================================================

            // Mapear equipamentos com tipo limpo e operacao da lista
            equipments = Array.from(uniqueEquips.values()).map(eq => {
"""

text = text.replace('// Mapear equipamentos com tipo limpo e operacao da lista\n            equipments = Array.from(uniqueEquips.values()).map(eq => {', ai_logic)


group_logic_old = """const rawGrp   = (eq.grupo || '').trim();
                const assignedGroup = customGroups[codStr] || rawGrp || 'PREPARO';
                const finalGroup = assignedGroup;"""

group_logic_new = """const rawGrp   = (eq.grupo || '').trim();
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

text = text.replace(group_logic_old, group_logic_new)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('AI logic added')
