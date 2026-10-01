import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('app.py', 'r', encoding='utf-8') as f:
    app = f.read()

# MASTER_OVERRIDES completo (copiado de get_api_equipamentos)
MASTER_OVERRIDES_CODE = """
        # ================================================================
        # MASTER OVERRIDES: Mapeamento estrito de Tipo e Grupo por Frota
        # O que nao estiver aqui vai para OUTROS (regra do usuario)
        # ================================================================
        MASTER_OVERRIDES = {
            # FERTIRRIGACAO
            '32': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '33': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '34': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '48': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '91': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '435': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11126': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11226': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11316': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11326': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11426': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11526': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11616': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '11626': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            '20123': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'FERTIRRIGACAO'},
            # TORRES SOLINFNET
            '101': {'tipo': 'TORRE SOLINFNET CONCENTRADOR', 'grupo': 'TORRES SOLINFNET'},
            # LINHA AMARELA
            '313': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '329': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '527': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '543': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '50116': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '50118': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '60116': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '60118': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '60120': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '60121': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            '60126': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'LINHA AMARELA'},
            # HERBICIDA
            '340': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11124': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11125': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11224': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11518': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11618': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '11718': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '70121': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            '70122': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'HERBICIDA'},
            # PREPARO
            '418': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '724': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '726': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '732': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11119': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11121': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11221': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11318': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11416': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11418': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11421': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            '11516': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'PREPARO'},
            # BIOMASSA
            '11116': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'BIOMASSA'},
            '11118': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'BIOMASSA'},
            '11216': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'BIOMASSA'},
            '11218': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'BIOMASSA'},
            '11321': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'BIOMASSA'},
            # TRATOS CULTURAIS
            '11324': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'TRATOS CULTURAIS'},
            '11424': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'TRATOS CULTURAIS'},
            '11524': {'tipo': 'TRATOR DE PNEUS LEVES MAG100R', 'grupo': 'TRATOS CULTURAIS'},
            # COLHEDORAS (FRENTES)
            '80116': {'tipo': 'COLHEDORA', 'grupo': 'COLHEDORA RESERVA'},
            '80118': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 08'},
            '80119': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 10'},
            '80120': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 15'},
            '80122': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 14'},
            '80124': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 13'},
            '80217': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 13'},
            '80219': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 14'},
            '80222': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 12'},
            '80224': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 13'},
            '80316': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 12'},
            '80317': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 08'},
            '80319': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 11'},
            '80320': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 12'},
            '80322': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 14'},
            '80419': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 11'},
            '80420': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 14'},
            '80422': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 14'},
            '80519': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 15'},
            '80619': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 12'},
            '80719': {'tipo': 'COLHEDORA', 'grupo': 'FRENTE 10'},
            # CAMINHOES CANAVIEIROS (Rodotrem / Cavalo Mecanico)
            '31115': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31125': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31215': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31225': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31315': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31316': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31325': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31415': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31425': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31515': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31525': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31615': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31625': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31715': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31725': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31825': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '31915': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},  # CORRIGIDO: era Apoio
            '31925': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311015': {'tipo': 'Caminhão Apoio', 'grupo': 'CAMINHOES'},
            '311025': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311115': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311125': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311215': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311225': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311325': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311425': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311525': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311625': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311725': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311825': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '311925': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            '312025': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES'},
            # CAMINHOES TREMIADOS (Canavieiro)
            '31815': {'tipo': 'Caminhão Apoio', 'grupo': 'CAMINHOES'},
            # CAMINHOES PIPA/VINHACA
            '31319': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '31617': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '31717': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '311117': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '311217': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '311317': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '311417': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            '311517': {'tipo': 'Caminhão Pipa/Vinhaça', 'grupo': 'CAMINHOES'},
            # CAMINHOES BOMBEIROS
            '31116': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            '31216': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            '31417': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            '31917': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            '38113': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            '311017': {'tipo': 'Caminhão Bombeiro', 'grupo': 'CAMINHOES'},
            # CAMINHOES BASCULANTES (Cacamba)
            '687': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            '689': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            '31120': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            '31317': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            '32117': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            '32217': {'tipo': 'Caminhão Basculante', 'grupo': 'CAMINHOES'},
            # PRANCHAS
            '31220': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            '31320': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            '31420': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            '42113': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            '42213': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            '42313': {'tipo': 'Prancha', 'grupo': 'CAMINHOES'},
            # FRENTES (carro de apoio de colhedora)
            '672': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '674': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38120': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38121': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38210': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38220': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38221': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            '38310': {'tipo': 'Frente', 'grupo': 'CAMINHOES'},
            # CAMINHOES TERCEIROS
            '38270': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES TERCEIROS'},
            '39490': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES TERCEIROS'},
            '50230': {'tipo': 'Caminhão Canavieiro', 'grupo': 'CAMINHOES TERCEIROS'},
        }
        
        override = MASTER_OVERRIDES.get(cod)
        if override:
            tipo = override['tipo']
            grp  = override['grupo']
        else:
            tipo = tipo or 'Outros'
            grp  = 'OUTROS'
"""

# Encontrar o bloco de auto-detecção a ser substituído
old_block = """            subs = ' '.join(os_sub_map.get(cod, [])).upper()
            full_text = f"{desc.upper()} {mod.upper()} {tipo.upper()} {subs}"

            if '14/1' in subs or 'COLHED' in subs or 'COLHED' in full_text or 'COLHEIT' in full_text:
                grp = 'COLHEDORA'
            elif '10/6' in subs or '10/1' in subs or '10/' in subs or 'TRANSPORTE DE CANA' in subs or 'CAVALO MECANICO' in subs or 'CAMINH' in full_text:
                grp = 'CAMINHOES'

            equipamentos.append({"""

new_block = """            subs = ' '.join(os_sub_map.get(cod, [])).upper()
            full_text = f"{desc.upper()} {mod.upper()} {tipo.upper()} {subs}"

""" + MASTER_OVERRIDES_CODE + """

            equipamentos.append({"""

if old_block in app:
    app = app.replace(old_block, new_block)
    print("OK: MASTER_OVERRIDES inserido em gerar_e_salvar_dados_json")
else:
    print("ERRO: bloco nao encontrado")
    # Show context for debugging
    idx = app.find("subs = ' '.join(os_sub_map")
    print(f"  Encontrado 'subs = ' at index {idx}")
    print(app[idx:idx+400])

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(app)
print("app.py salvo!")
