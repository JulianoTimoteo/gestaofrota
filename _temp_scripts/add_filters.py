import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add the buttons to the stats div in header
stats_pattern = r'(<span class="counter os".*?c/OS[^<]*</span>\s*</div>)'
replacement = r"""\1
            <div class="global-os-filters" style="display: flex; gap: 4px; margin-left: auto; align-items: center; padding-left: 10px;">
                <button class="btn-filter-os active" data-osfilter="ABERTA" title="TIPO OS = NORMAL, STATUS = ABERTA" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#334155; color:#fff; cursor:pointer;"><i class="fas fa-wrench"></i> Aberta</button>
                <button class="btn-filter-os" data-osfilter="REPARO" title="TIPO OS = REPARO" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#1e293b; color:#cbd5e1; cursor:pointer;"><i class="fas fa-tools"></i> Reparo</button>
                <button class="btn-filter-os" data-osfilter="COMUNICADA" title="STATUS = COMUNICADA" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#1e293b; color:#cbd5e1; cursor:pointer;"><i class="fas fa-bullhorn"></i> Comunicada</button>
                <button class="btn-filter-os" data-osfilter="TODAS" title="Todas as OS (Exceto Fechadas)" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#1e293b; color:#cbd5e1; cursor:pointer;"><i class="fas fa-list"></i> Todas</button>
            </div>"""
html = re.sub(stats_pattern, replacement, html)

# 2. Add global JS logic for filtering ordensServico
# Right after let isSyncing = false;
var_pattern = r'(let isSyncing\s*=\s*false;)'
var_repl = r"\1\n        let currentOsFilter = 'ABERTA';"
html = re.sub(var_pattern, var_repl, html)

# Modify the processDadosJson to filter the OS array
process_pattern = r"(ordensServico\s*=\s*d\.ordensServico\s*\|\|\s*\[\];)"
process_repl = r"""\1

            // APPLY OS FILTER
            ordensServico = ordensServico.filter(os => {
                const tipoOS = (os.tipoOS || '').toUpperCase();
                const statusOS = (os.statusOS || '').toUpperCase();
                
                if (currentOsFilter === 'ABERTA') {
                    return tipoOS === 'NORMAL' && statusOS === 'ABERTA';
                } else if (currentOsFilter === 'REPARO') {
                    return tipoOS.includes('REPARO');
                } else if (currentOsFilter === 'COMUNICADA') {
                    return statusOS === 'COMUNICADA';
                }
                return true; // TODAS
            });
"""
html = re.sub(process_pattern, process_repl, html)

# Add event listeners for the buttons inside initApp()
init_app_pattern = r"(function initApp\(\)\s*\{)"
init_app_repl = r"""\1
            // Global OS Filters
            document.querySelectorAll('.btn-filter-os').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.btn-filter-os').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = '#1e293b';
                        b.style.color = '#cbd5e1';
                    });
                    e.currentTarget.classList.add('active');
                    e.currentTarget.style.background = '#334155';
                    e.currentTarget.style.color = '#fff';
                    
                    currentOsFilter = e.currentTarget.getAttribute('data-osfilter');
                    
                    // Reload data from API to re-process with new filter
                    carregarDados();
                });
            });
"""
html = re.sub(init_app_pattern, init_app_repl, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Filters added to index.html!")
