import requests

base_url = 'http://localhost:8000'

print("=== Testando Login vindo do site GitHub Pages gestaofrota ===")

# 1. Login julianotimoteo de https://julianotimoteo.github.io/gestaofrota/
res1 = requests.post(f"{base_url}/api/auth/login", 
                     headers={"Origin": "https://julianotimoteo.github.io"},
                     json={"usuario": "julianotimoteo", "senha": "tmotvini1986@#", "origem_site": "https://julianotimoteo.github.io/gestaofrota/"})
print("Login Juliano:", res1.status_code, res1.json())

# 2. Login rafaelfarra de https://julianotimoteo.github.io/gestaofrota/
res2 = requests.post(f"{base_url}/api/auth/login", 
                     headers={"Origin": "https://julianotimoteo.github.io"},
                     json={"usuario": "rafaelfarra", "senha": "farra@2026", "origem_site": "https://julianotimoteo.github.io/gestaofrota/"})
print("Login Rafael:", res2.status_code, res2.json())

# 3. Status da API
st = requests.get(f"{base_url}/api/status").json()
print("\n=== STATUS DA API EM TEMPO REAL ===")
print("Chaves no data:", list(st.get('data', {}).keys()))
print(f"Total Usuarios Cadastrados: {st['data'].get('totalUsuarios')}")
print(f"Usuarios Conectados Agora: {st['data'].get('usuariosConectados')}")

sessoes = st['data'].get('sessoesAtivas', [])
print("Sessoes Ativas e Origem do Site:")
for s in sessoes:
    print(f" - Usuario: {s.get('usuario')} ({s.get('nome')}) | Origem: {s.get('origem_site')} | IP: {s.get('ip_origem')} | Atividade: {s.get('ultima_atividade')}")

# 4. GET /api/sessoes/activas
act = requests.get(f"{base_url}/api/sessoes/activas").json()
print("\n=== ENDPOINT /api/sessoes/activas ===")
print("Total sessoes:", act.get('total'))
for s in act.get('data', []):
    print(f" - {s.get('usuario')} | Origem: {s.get('origem_site')} | IP: {s.get('ip_origem')}")
