import os
import sys
import time
import threading
import webbrowser
import logging
from PIL import Image, ImageDraw
import pystray

# Ajusta path para imports locais
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import app

# Variáveis de estado global da bandeja
ESTADO_ATUAL = "verde"
MENSAGEM_ATUAL = "Iniciando Gestão de Frota..."
TRAY_ICON = None
FLASK_THREAD = None
RUNNING = True

# Paleta de cores para os ícones
CORES_ICONE = {
    'verde': {
        'borda': (20, 140, 20, 255),
        'fundo': (46, 204, 113, 255),
        'brilho': (180, 255, 180, 255)
    },
    'amarelo': {
        'borda': (180, 140, 0, 255),
        'fundo': (241, 196, 15, 255),
        'brilho': (255, 250, 180, 255)
    },
    'vermelho': {
        'borda': (160, 20, 20, 255),
        'fundo': (231, 76, 60, 255),
        'brilho': (255, 180, 180, 255)
    }
}

CACHE_ICONES = {}

def obter_icone(cor_nome):
    """Gera ou retorna do cache o ícone da cor especificada."""
    cor_nome = cor_nome.lower()
    if cor_nome in CACHE_ICONES:
        return CACHE_ICONES[cor_nome]

    largura = 64
    altura = 64
    img = Image.new('RGBA', (largura, altura), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    c = CORES_ICONE.get(cor_nome, CORES_ICONE['verde'])

    # Desenha esfera 3D
    draw.ellipse((4, 4, largura - 4, altura - 4), fill=c['fundo'], outline=c['borda'], width=4)
    draw.ellipse((14, 10, 32, 24), fill=c['brilho'])
    draw.ellipse((22, 22, largura - 22, altura - 22), outline=c['borda'], width=2)

    CACHE_ICONES[cor_nome] = img
    return img

def atualizar_status_bandeja(cor, mensagem):
    """Callback invocado pelo app.py para atualizar a cor e o tooltip da bandeja."""
    global ESTADO_ATUAL, MENSAGEM_ATUAL, TRAY_ICON
    ESTADO_ATUAL = cor
    MENSAGEM_ATUAL = mensagem
    
    if TRAY_ICON:
        try:
            TRAY_ICON.icon = obter_icone(cor)
            texto_tooltip = f"Gestão de Frota v14\nStatus: {mensagem}"
            if len(texto_tooltip) > 120:
                texto_tooltip = texto_tooltip[:117] + "..."
            TRAY_ICON.title = texto_tooltip
        except Exception as e:
            pass

# Ações do Menu da Bandeja
def acao_abrir_painel(icon, item):
    """Abre o navegador na interface de Gestão de Frota."""
    webbrowser.open('http://localhost:8000')

def acao_sincronizar_agora(icon, item):
    """Dispara ciclo de sincronização forçado."""
    def _do_sync():
        atualizar_status_bandeja("verde", "Sincronizando agora sob demanda...")
        try:
            app.sync_service.run_sync_cycle()
        except Exception as err:
            atualizar_status_bandeja("vermelho", f"Falha no sync: {err}")
    threading.Thread(target=_do_sync, daemon=True).start()

def acao_sincronizar_firebase(icon, item):
    """Dispara sincronização imediata para a nuvem Firebase."""
    def _do_fb():
        atualizar_status_bandeja("verde", "Enviando dados para o Firebase Cloud...")
        try:
            import firebase_sync
            conn = app.get_db_connection()
            ok, msg = firebase_sync.sincronizar_banco_local_com_firebase(conn)
            conn.close()
            if ok:
                atualizar_status_bandeja("amarelo", "Nuvem Firebase atualizada com sucesso!")
            else:
                atualizar_status_bandeja("vermelho", f"Erro Firebase: {msg[:40]}")
        except Exception as err:
            atualizar_status_bandeja("vermelho", f"Erro Firebase: {str(err)[:40]}")
    threading.Thread(target=_do_fb, daemon=True).start()

def acao_abrir_pasta_servidor(icon, item):
    """Abre a pasta local onde o servidor está operando."""
    try:
        pasta = app.BASE_DIR
        os.startfile(pasta)
    except Exception:
        pass

def acao_sair(icon, item):
    """Encerra graciosamente o servidor e remove o ícone da bandeja."""
    global RUNNING
    RUNNING = False
    try:
        app.sync_service.stop()
    except Exception:
        pass
    icon.stop()
    os._exit(0)

def criar_menu_bandeja():
    """Gera os itens do menu de contexto da bandeja."""
    return pystray.Menu(
        pystray.MenuItem(lambda text: f"● {MENSAGEM_ATUAL}", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("🌐 Abrir Painel de Gestão (Navegador)", acao_abrir_painel, default=True),
        pystray.MenuItem("🔄 Sincronizar Agora (SimpleFarm)", acao_sincronizar_agora),
        pystray.MenuItem("☁️ Sincronizar Nuvem (Firebase Firestore)", acao_sincronizar_firebase),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("📁 Abrir Pasta do Servidor", acao_abrir_pasta_servidor),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("❌ Encerrar Servidor", acao_sair)
    )

def iniciar_servidor_flask():
    """Roda a inicialização completa do Flask e loops de sincronização."""
    try:
        # Inicializa banco e tabelas
        app.init_db()

        # Conecta callback de notificações da bandeja
        app.set_tray_callback(atualizar_status_bandeja)

        # Dispara geração inicial de dados.json e alarmes
        try:
            app.gerar_e_salvar_dados_json()
            app.checar_regras_alarmes()
        except Exception as e:
            pass

        # Inicia loop contínuo do Live Tunnel e checagem de alarmes
        def _tunnel_loop():
            while RUNNING:
                time.sleep(30)
                try:
                    app.gerar_e_salvar_dados_json()
                    app.checar_regras_alarmes()
                except Exception:
                    pass

        t_tunnel = threading.Thread(target=_tunnel_loop, daemon=True)
        t_tunnel.start()

        # Inicia monitor de CPU
        t_cpu = threading.Thread(target=app._cpu_monitor_loop, daemon=True)
        t_cpu.start()

        # Inicia suporte na porta 3000
        t_3000 = threading.Thread(target=app._start_port_3000_server, daemon=True)
        t_3000.start()

        # Inicia filas e daemons
        app.sd_mirror_queue.start()
        app.watchdog_service.start()
        app.start_sync_thread()

        # Atualiza bandeja para estado amarelo (em espera/pronto)
        atualizar_status_bandeja("amarelo", "Online — Servidor pronto na porta 8000")

        # Roda Flask
        app.app.run(host='0.0.0.0', port=8000, debug=False, threaded=True, use_reloader=False)
    except Exception as e:
        atualizar_status_bandeja("vermelho", f"Erro fatal ao iniciar servidor: {e}")

def main():
    global TRAY_ICON, FLASK_THREAD

    # Garante ícone inicial verde
    icone_inicial = obter_icone('verde')

    # Inicia Flask em thread daemon
    FLASK_THREAD = threading.Thread(target=iniciar_servidor_flask, daemon=True)
    FLASK_THREAD.start()

    # Cria e roda ícone na bandeja do Windows
    TRAY_ICON = pystray.Icon(
        name="GestaoFrotaServidor",
        icon=icone_inicial,
        title="Gestão de Frota v14 — Servidor Ativo",
        menu=criar_menu_bandeja()
    )

    print("[Tray] Servidor de Gestão de Frota rodando na bandeja do sistema...", flush=True)
    TRAY_ICON.run()

if __name__ == '__main__':
    main()
