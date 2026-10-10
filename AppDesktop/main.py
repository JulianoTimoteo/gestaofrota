"""
Gestao de Frota - Aplicativo Desktop Nativo (WebView Embutida + Servidor Integrado)
Usina Pitangueiras
"""
import os
import sys
import time
import socket
import threading
import subprocess
import webview

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(APP_DIR)
APPWEB_DIR = os.path.join(ROOT_DIR, "Appweb")
ICON_PATH = os.path.join(APP_DIR, "app_icon.ico")

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_backend():
    # Verifica se a porta 8000 ja esta respondendo
    if is_port_in_use(8000):
        print("[Desktop App] Servidor backend ja esta ativo na porta 8000.")
        return

    print("[Desktop App] Iniciando servidor backend integrado...")
    server_script = os.path.join(ROOT_DIR, "Servidor-Banco", "app.py")
    if os.path.exists(server_script):
        def _run_server():
            # Executa o app.py em background
            subprocess.run([sys.executable, server_script], cwd=os.path.dirname(server_script))
        
        t = threading.Thread(target=_run_server, daemon=True)
        t.start()
        # Aguarda ate o servidor subir
        for _ in range(15):
            if is_port_in_use(8000):
                print("[Desktop App] Servidor backend iniciado com sucesso.")
                break
            time.sleep(1)

def main():
    # 1. Garante que o backend esta ativo
    start_backend()

    # 2. Inicia o daemon de sincronizacao com o GitHub Pages se existir
    sync_daemon = os.path.join(ROOT_DIR, "auto_git_sync.py")
    if os.path.exists(sync_daemon):
        subprocess.Popen([sys.executable, sync_daemon], cwd=ROOT_DIR, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)

    # 3. Determina URL de abertura
    # Prioriza servidor local na porta 8000 (com scraper direto) ou carrega o Appweb embutido
    target_url = "http://127.0.0.1:8000" if is_port_in_use(8000) else f"file:///{APPWEB_DIR}/index.html".replace("\\", "/")

    print(f"[Desktop App] Abrindo interface nativa em: {target_url}")

    # 4. Cria a janela Desktop com o icone oficial
    window = webview.create_window(
        title="Gestão de Frota - Usina Pitangueiras",
        url=target_url,
        width=1280,
        height=800,
        min_size=(900, 600),
        text_select=True,
        zoomable=True
    )

    webview.start(debug=False, icon=ICON_PATH if os.path.exists(ICON_PATH) else None)

if __name__ == '__main__':
    main()
