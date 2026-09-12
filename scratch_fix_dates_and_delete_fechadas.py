import sqlite3
from datetime import datetime

def formatar_data_br(val):
    if not val:
        return ''
    val = str(val).strip()
    if not val or val.lower() in ('none', 'null', '/ - -', '-'):
        return ''
    # Já está em DD/MM/YYYY...
    if len(val) >= 10 and val[2] == '/' and val[5] == '/':
        return val
    try:
        clean_val = val.replace('Z', '').split('.')[0]
        if 'T' in clean_val:
            dt = datetime.strptime(clean_val, '%Y-%m-%dT%H:%M:%S')
            return dt.strftime('%d/%m/%Y %H:%M:%S')
        elif '-' in clean_val and len(clean_val.split('-')[0]) == 4:
            parts = clean_val.split()
            date_part = parts[0]
            time_part = parts[1] if len(parts) > 1 else ''
            y, m, d = date_part.split('-')
            res = f"{d.zfill(2)}/{m.zfill(2)}/{y}"
            if time_part:
                res += f" {time_part}"
            return res
    except Exception as e:
        print(f"Error formatting {val}: {e}")
    return val

db_paths = ['meus_banco.db', '../meus_banco.db']
for dbp in db_paths:
    try:
        conn = sqlite3.connect(dbp)
        # 1. Delete FECHADA OS
        c1 = conn.execute("DELETE FROM ordens_servico WHERE upper(status_os) = 'FECHADA'")
        print(f"[{dbp}] Deleted FECHADA OS count:", c1.rowcount)

        # 2. Reformat data_entrada and data_previsao
        rows = conn.execute("SELECT id, data_entrada, data_previsao FROM ordens_servico").fetchall()
        updated_cnt = 0
        for r_id, de, dp in rows:
            de_br = formatar_data_br(de)
            dp_br = formatar_data_br(dp)
            if de_br != de or dp_br != dp:
                conn.execute("UPDATE ordens_servico SET data_entrada = ?, data_previsao = ? WHERE id = ?", (de_br, dp_br, r_id))
                updated_cnt += 1
        conn.commit()
        conn.close()
        print(f"[{dbp}] Updated date formats for {updated_cnt} OS records.")
    except Exception as exc:
        print(f"[{dbp}] Error:", exc)
