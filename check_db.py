import sqlite3

def check_db():
    try:
        conn = sqlite3.connect('meus_banco.db')
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables:", tables)
        
        # Check os count
        cursor.execute("SELECT count(*) FROM ordens_servico;")
        print("Total OS:", cursor.fetchone()[0])
        
        # Check log if exists
        if ('sincronizacao_log',) in tables:
            cursor.execute("SELECT * FROM sincronizacao_log ORDER BY id DESC LIMIT 5;")
            print("Logs:")
            for row in cursor.fetchall():
                print(row)
                
    except Exception as e:
        print("Error:", e)
        
if __name__ == '__main__':
    check_db()
