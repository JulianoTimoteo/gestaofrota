import sqlite3
import requests

conn = sqlite3.connect('meus_banco.db')
c = conn.cursor()

c.execute("SELECT status_os, count(*) FROM ordens_servico GROUP BY status_os")
print("Counts grouped by status_os:")
for row in c.fetchall():
    print("  ", row)

c.execute("SELECT upper(status_os), count(*) FROM ordens_servico GROUP BY upper(status_os)")
print("Counts grouped by upper(status_os):")
for row in c.fetchall():
    print("  ", row)

# Also query local server /api/status
try:
    r = requests.get('http://127.0.0.1:8000/api/status', timeout=3)
    print("\n/api/status HTTP response:")
    print(r.json())
except Exception as e:
    print("Error querying /api/status:", e)
