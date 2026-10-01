import re

with open('app.py', 'r', encoding='utf-8') as f:
    app_code = f.read()

# Fix the ordens_servico query
# We will use regex to replace it
query_pattern = re.compile(r"cur_os = conn\.execute\('''\s*SELECT tipo_os, sub_classe, codigo_equip.*?END ASC\s*'''\)", re.DOTALL)
new_query_str = """cur_os = conn.execute('''
            SELECT tipo_os, subclasse as sub_classe, frota_cc, cod_os, status_os, tipo_oficina, oficina,
                   data_entrada, data_previsao, dias_permanencia, descricao_servico as descricao, atualizado_em as data_sincronizacao
            FROM ordens_servico 
            WHERE upper(status_os) != 'FECHADA' AND ativo = 1
            ORDER BY 
                CASE 
                    WHEN data_entrada LIKE '__/__/____%' THEN
                        substr(data_entrada, 7, 4) || '-' || substr(data_entrada, 4, 2) || '-' || substr(data_entrada, 1, 2) || substr(data_entrada, 11)
                    ELSE data_entrada 
                END ASC
        ''')"""
app_code = query_pattern.sub(new_query_str, app_code)

# Fix the dict creation that relies on codigo_equip
# It's at:
# 'codigoEquip': r['codigo_equip'],
# 'frotaCC': r['frota_cc'],

dict_pattern = re.compile(r"ordens_servico\.append\(\{.*?\}\)", re.DOTALL)
new_dict_str = """
            # Extract codigoEquip from frota_cc
            frota_str = str(r['frota_cc'] or '')
            codigo_equip = frota_str.split('-')[0].strip() if '-' in frota_str else frota_str

            ordens_servico.append({
                'tipoOS': r['tipo_os'] or 'NORMAL',
                'subClasse': r['sub_classe'] or '',
                'codigoEquip': codigo_equip,
                'frotaCC': r['frota_cc'],
                'codOS': r['cod_os'],
                'statusOS': r['status_os'],
                'tipoOficina': r['tipo_oficina'],
                'oficina': r['oficina'],
                'dataEntrada': r['data_entrada'],
                'dataPrevisao': r['data_previsao'],
                'diasPermanencia': r['dias_permanencia'],
                'descricao': r['descricao'],
                'dataSincronizacao': r['data_sincronizacao']
            })"""
app_code = dict_pattern.sub(new_dict_str.strip(), app_code)

# Replace the os_map insertion logic
os_map_pattern = re.compile(r"for raw in \(r\['codigo_equip'\], r\['frota_cc'\]\):")
app_code = os_map_pattern.sub(r"for raw in (codigo_equip, r['frota_cc']):", app_code)

# Wait, there's another query at line 1139: api_os() endpoint!
# It does the same thing. 
# We used DOTALL, it should replace all occurrences of the query.

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Queries patched!")
