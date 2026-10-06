"""
Auto-Sync GitHub Daemon
Monitora continuamente alteracoes em Appweb/dados.json
Quando o arquivo e modificado pelo servidor (GestaoFrota_Servidor.exe),
este daemon executa automaticamente o git add, git commit e git push para o GitHub Pages.
"""
import os
import sys
import time
import subprocess
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DADOS_JSON = os.path.join(ROOT_DIR, "Appweb", "dados.json")
POLL_INTERVAL = 30  # checa a cada 30 segundos
COOLDOWN_SECONDS = 90  # no minimo 90 segundos entre pushes do git

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Auto-Git-Sync] {msg}", flush=True)

def push_to_github():
    try:
        agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        # Adicionar dados.json
        subprocess.run(['git', 'add', 'Appweb/dados.json', 'Appweb/index.html'], cwd=ROOT_DIR, capture_output=True, timeout=15)
        # Commit
        c_res = subprocess.run(['git', 'commit', '-m', f'chore(auto-sync): dados SimpleFarm {agora}'], cwd=ROOT_DIR, capture_output=True, text=True, timeout=15)
        if c_res.returncode == 0:
            log(f"Commit gerado com sucesso. Enviando push para origin master...")
            p_res = subprocess.run(['git', 'push', 'origin', 'master'], cwd=ROOT_DIR, capture_output=True, text=True, timeout=30)
            if p_res.returncode == 0:
                log(f"Push concluido com sucesso no GitHub Pages! Dados sincronizados: {agora}")
                return True
            else:
                log(f"Erro no push: {p_res.stderr.strip()[:120]}")
        else:
            if "nothing to commit" not in c_res.stdout and "nothing to commit" not in c_res.stderr:
                log(f"Git commit info: {c_res.stdout.strip()[:100]}")
    except Exception as e:
        log(f"Excecao no push: {e}")
    return False

def main():
    log(f"Iniciando monitoramento de dados.json em {DADOS_JSON}")
    last_mtime = 0
    last_push_time = 0

    if os.path.exists(DADOS_JSON):
        last_mtime = os.path.getmtime(DADOS_JSON)

    while True:
        try:
            time.sleep(POLL_INTERVAL)
            if not os.path.exists(DADOS_JSON):
                continue

            current_mtime = os.path.getmtime(DADOS_JSON)
            now = time.time()

            if current_mtime > last_mtime:
                last_mtime = current_mtime
                if now - last_push_time >= COOLDOWN_SECONDS:
                    log("Modificacao detectada no dados.json. Disparando sincronizacao com GitHub Pages...")
                    if push_to_github():
                        last_push_time = time.time()
                else:
                    log(f"dados.json modificado, aguardando cooldown ({int(COOLDOWN_SECONDS - (now - last_push_time))}s restantes)...")
        except KeyboardInterrupt:
            break
        except Exception as e:
            log(f"Erro no loop de monitoramento: {e}")
            time.sleep(10)

if __name__ == '__main__':
    main()
