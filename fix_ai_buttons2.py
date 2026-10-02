import re

with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to find any remaining teamUpper === 'OUTROS' checks and replace them with the standard buttons
text = re.sub(
    r"\$\{teamUpper === 'OUTROS' \? `<button onclick=\\\"promptMoveToEquipe\('\$\{eq\.codigo\}'\)\\\" title=\\\"Mover para uma Equipe\\\" style=\\\"padding:2px 6px; font-size:10px; background:var\(--color-primary\); color:#fff; border:none; border-radius:4px; cursor:pointer;\\\">\s*<i class=\\\"fas fa-plus\\\"></i>\s*</button>` : ''\}",
    r"<button onclick=\"promptMoveToEquipe('${eq.codigo}')\" title=\"Mover para uma Equipe\" style=\"padding:2px 6px; font-size:10px; background:var(--color-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-plus\"></i></button> ${eq.isAIGuess ? `<button onclick=\"confirmAIGuess('${eq.codigo}', '${eq.grupo}')\" title=\"Confirmar sugestão da IA\" style=\"padding:2px 6px; font-size:10px; background:#22c55e; color:#fff; border:none; border-radius:4px; cursor:pointer;\"><i class=\"fas fa-check\"></i></button>` : ''}",
    text
)

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated all buttons')
