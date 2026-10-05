import os
import sys
import shutil
import subprocess
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
DIST_DIR = os.path.join(ROOT_DIR, "GestaoFrota_Servidor_Pendrive")

print("=" * 70)
print("COMPILADOR PORTÁTIL DE SERVIDOR — VERSÃO FINAL PENDRIVE")
print("=" * 70)
print(f"Diretório Base: {BASE_DIR}")
print(f"Destino Final:  {DIST_DIR}")

# 1. Definir compatibilidade de distutils para o PyInstaller no Windows
os.environ["SETUPTOOLS_USE_DISTUTILS"] = "stdlib"

# 1. Gerar ícone .ico oficial
ico_path = os.path.join(BASE_DIR, "icone_app.ico")
try:
    img_verde = Image.open(os.path.join(BASE_DIR, "icone_verde.png"))
    img_verde.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("[1/5] Ícone .ico oficial gerado com sucesso!")
except Exception as e:
    print(f"[!] Aviso ao gerar .ico: {e}")
    ico_path = None

# 2. Executar PyInstaller
exe_temp = os.path.join(BASE_DIR, "dist_temp", "GestaoFrota_Servidor", "GestaoFrota_Servidor.exe")
rebuild = "--rebuild" in sys.argv or not os.path.exists(exe_temp)

if rebuild:
    print("\n[2/5] Compilando servidor com PyInstaller (aguarde alguns instantes)...")
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "GestaoFrota_Servidor",
        "--onedir",
        "--noconsole",
        "--clean",
        "--noconfirm",
        "--hidden-import", "sqlite3",
        "--hidden-import", "requests",
        "--hidden-import", "urllib3",
        "--hidden-import", "firebase_admin",
        "--hidden-import", "firebase_admin.credentials",
        "--hidden-import", "firebase_admin.firestore",
        "--hidden-import", "pystray",
        "--hidden-import", "pystray._win32",
        "--hidden-import", "PIL",
        "--hidden-import", "PIL.Image",
        "--hidden-import", "PIL.ImageDraw",
        "--hidden-import", "jwt",
        "--hidden-import", "psutil",
        "--hidden-import", "dotenv",
        "--distpath", os.path.join(BASE_DIR, "dist_temp"),
        "--workpath", os.path.join(BASE_DIR, "build_temp"),
        "--specpath", os.path.join(BASE_DIR, "spec_temp"),
    ]

    if ico_path and os.path.exists(ico_path):
        pyinstaller_cmd.extend(["--icon", ico_path])

    pyinstaller_cmd.append(os.path.join(BASE_DIR, "servidor_bandeja.py"))

    ret = subprocess.run(pyinstaller_cmd)
    if ret.returncode != 0:
        print("[ERRO] Falha durante a compilação com PyInstaller!")
        sys.exit(ret.returncode)

    print("[2/5] Compilação PyInstaller concluída com sucesso!")
else:
    print("\n[2/5] Executável já compilado em dist_temp. Usando binário existente (use --rebuild para forçar).")


# 3. Montar a pasta portátil final para o Pendrive
print("\n[3/5] Montando pasta portátil final para o Pendrive...")
os.makedirs(DIST_DIR, exist_ok=True)

# Copia arquivos do executável
origem_dist = os.path.join(BASE_DIR, "dist_temp", "GestaoFrota_Servidor")
if os.path.exists(origem_dist):
    for item in os.listdir(origem_dist):
        s = os.path.join(origem_dist, item)
        d = os.path.join(DIST_DIR, item)
        if os.path.isdir(s):
            if os.path.exists(d):
                shutil.rmtree(d)
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

# 4. Copiar arquivos de suporte e dados essenciais
print("\n[4/5] Copiando banco de dados, credenciais do Firebase e Frontend...")

# Banco de dados SQLite
db_origem = os.path.join(BASE_DIR, "simplefarm.db")
if os.path.exists(db_origem):
    shutil.copy2(db_origem, os.path.join(DIST_DIR, "simplefarm.db"))
    print("  [OK] simplefarm.db copiado com sucesso!")

# Credenciais Firebase
key_name = "osoficina-firebase-adminsdk-fbsvc-e1d1ef7a32.json"
key_origem = os.path.join(BASE_DIR, key_name)
if not os.path.exists(key_origem):
    key_origem = os.path.join(os.path.dirname(BASE_DIR), "VersaoDesktop", key_name)
if os.path.exists(key_origem):
    shutil.copy2(key_origem, os.path.join(DIST_DIR, key_name))
    print(f"  [OK] {key_name} copiado com sucesso!")
else:
    print(f"  [AVISO] {key_name} nao encontrado em {key_origem}")

# Frontend estático Appweb
fe_origem = os.path.join(ROOT_DIR, "Appweb")
fe_destino = os.path.join(DIST_DIR, "Appweb")
if os.path.exists(fe_origem):
    if os.path.exists(fe_destino):
        shutil.rmtree(fe_destino)
    shutil.copytree(fe_origem, fe_destino)
    print("  [OK] Pasta Appweb copiada com sucesso!")
else:
    print(f"  [AVISO] Pasta Appweb nao encontrada em {fe_origem}")

# Script Batch de Inicialização Rápida no Pendrive
bat_content = """@echo off
title Gestao de Frota - Servidor Bandeja
cd /d "%~dp0"
echo ========================================================
echo   INICIANDO SERVIDOR GESTAO DE FROTA (BANDEJA WINDOWS)
echo ========================================================
echo O servidor operara em segundo plano perto do relogio.
echo.
start "" "%~dp0GestaoFrota_Servidor.exe"
exit
"""
with open(os.path.join(DIST_DIR, "Iniciar_Servidor.bat"), "w", encoding="utf-8") as f:
    f.write(bat_content)
print("  [OK] Iniciar_Servidor.bat criado com sucesso!")

# Manual de Uso para Pendrive
leia_me = """========================================================================
GESTAO DE FROTA v14 — SERVIDOR PORTATIL DE PRODUCAO (VERSAO PENDRIVE)
========================================================================

Este pacote contem o Servidor Autonomo de Gestao de Frota e Integracao
com SimpleFarm e Nuvem Firebase Firestore.

1. COMO USAR NO OUTRO COMPUTADOR:
----------------------------------
- Copie toda esta pasta para o computador de destino (pode ser colocado em 
  C:\\GestaoFrota ou rodar diretamente do proprio pendrive).
- De dois cliques em: Iniciar_Servidor.bat (ou GestaoFrota_Servidor.exe).
- O servidor iniciara imediatamente em segundo plano perto do relogio do Windows.

2. CORES DO ICONE NA BANDEJA:
------------------------------
[VERDE]:    O servidor esta ativo, raspando dados ou sincronizando com a nuvem.
[AMARELO]:  O servidor concluiu a sincronizacao e esta em espera/repouso (5 min).
[VERMELHO]: Ocorreu erro de rede ou falha de autenticacao no SimpleFarm.

3. MENU DO BOTAO DIREITO NA BANDEJA:
------------------------------------
- Clicar com o botao direito no icone perto do relogio exibe:
  * Status e horario do ultimo ciclo
  * "Sincronizar Agora" (forca raspagem imediata)
  * "Sincronizar Nuvem (Firebase Firestore)"
  * "Abrir Painel de Gestao (Navegador)" -> Abre http://localhost:8000
  * "Abrir Pasta do Servidor"
  * "Encerrar Servidor" (encerra liberando a porta 8000)

4. INICIALIZACAO AUTOMATICA COM O WINDOWS (OPCIONAL):
-----------------------------------------------------
Se desejar que o servidor inicie sozinho quando o computador ligar:
- Pressione as teclas Windows + R
- Digite: shell:startup e pressione Enter
- Crie um atalho de Iniciar_Servidor.bat dentro desta pasta.

Usina Pitangueiras — Gestao de Frota Automotiva e Agricola
========================================================================
"""
with open(os.path.join(DIST_DIR, "LEIA-ME_COMO_USAR.txt"), "w", encoding="utf-8") as f:
    f.write(leia_me)
print("  [OK] LEIA-ME_COMO_USAR.txt criado com sucesso!")

# 5. Limpeza de temporários
print("\n[5/5] Limpando pastas temporárias de compilação...")
for temp_dir in ["dist_temp", "build_temp", "spec_temp"]:
    p = os.path.join(BASE_DIR, temp_dir)
    if os.path.exists(p):
        shutil.rmtree(p, ignore_errors=True)

print("\n" + "=" * 70)
print("[SUCESSO] PACOTE PENDRIVE CRIADO COM SUCESSO!")
print(f"Pasta Pronta para Copiar: {DIST_DIR}")
print("=" * 70)

