with open('Appweb/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Change default currentOsFilter
text = text.replace("let currentOsFilter = 'ABERTA';", "let currentOsFilter = 'TODAS';")

# Change inline styles for Aberta and Todas in HTML
text = text.replace(
    '<button class="btn-filter-os active" data-osfilter="ABERTA" title="TIPO OS = NORMAL, STATUS = ABERTA" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#334155; color:#fff; cursor:pointer;"><i class="fas fa-wrench"></i> Aberta</button>',
    '<button class="btn-filter-os" data-osfilter="ABERTA" title="TIPO OS = NORMAL, STATUS = ABERTA" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#1e293b; color:#cbd5e1; cursor:pointer; transition: all 0.3s;"><i class="fas fa-wrench"></i> Aberta</button>'
)

text = text.replace(
    '<button class="btn-filter-os" data-osfilter="TODAS" title="Todas as OS (Exceto Fechadas)" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #475569; background:#1e293b; color:#cbd5e1; cursor:pointer;"><i class="fas fa-list"></i> Todas</button>',
    '<button class="btn-filter-os active" data-osfilter="TODAS" title="Todas as OS (Exceto Fechadas)" style="font-size:0.75rem; padding:2px 6px; border-radius:4px; border:1px solid #3b82f6; background:#3b82f6; color:#fff; cursor:pointer; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5); transition: all 0.3s;"><i class="fas fa-list"></i> Todas</button>'
)

# Update Javascript logic
old_js = """e.currentTarget.classList.add('active');
                    e.currentTarget.style.background = '#334155';
                    e.currentTarget.style.color = '#fff';"""
                    
new_js = """e.currentTarget.classList.add('active');
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.5)';"""

text = text.replace(old_js, new_js)

old_reset = """b.classList.remove('active');
                        b.style.background = '#1e293b';
                        b.style.color = '#cbd5e1';"""

new_reset = """b.classList.remove('active');
                        b.style.background = '#1e293b';
                        b.style.borderColor = '#475569';
                        b.style.color = '#cbd5e1';
                        b.style.boxShadow = 'none';"""

text = text.replace(old_reset, new_reset)

# Also ensure transition is added to other buttons
text = text.replace('cursor:pointer;"><i class="fas fa-tools', 'cursor:pointer; transition: all 0.3s;"><i class="fas fa-tools')
text = text.replace('cursor:pointer;"><i class="fas fa-bullhorn', 'cursor:pointer; transition: all 0.3s;"><i class="fas fa-bullhorn')

with open('Appweb/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Buttons updated.')
