import sqlite3
import os

paths = [
    'meus_banco.db',
    '/sdcard/simplefarm/meus_banco.db',
    '/data/data/com.termux/files/home/simplefarm/meus_banco.db'
]

for p in paths:
    if os.path.exists(p):
        print(f"=== CHECKING {p} ===")
        conn = sqlite3.connect(p)
        conn.row_factory = sqlite3.Row
        users = conn.execute('SELECT * FROM usuarios').fetchall()
        print("USUARIOS:")
        for u in users:
            print(dict(u))
        
        sessions = conn.execute('SELECT s.id, u.usuario, s.ip_origem, s.expira_em, s.ativo, s.criado_em, s.ultima_atividade FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id').fetchall()
        print("\nSESSOES:")
        for s in sessions:
            print(dict(s))
        conn.close()
