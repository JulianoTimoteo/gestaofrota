import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = re.compile(r"window\.promptMoveToEquipe = function\(cod\) \{.*?\};\n", re.DOTALL)
new_code = """window.promptMoveToEquipe = function(cod) {
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

html = pattern.sub(new_code, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
