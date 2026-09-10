#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# SimpleFarm Integration — Watchdog & Self-Healing Service
# Monitora Python (8000), Node (3000) e Browser no Tablet Android
# ============================================================

export HOME="/data/data/com.termux/files/home"
export PATH="/data/data/com.termux/files/usr/bin:$PATH"
export LD_LIBRARY_PATH="/data/data/com.termux/files/usr/lib"
export PREFIX="/data/data/com.termux/files/usr"

# Suporta ambos os nomes de pasta (simlink ou diretorio direto)
if [ -d "/data/data/com.termux/files/home/simple-farm-integration-fase1" ]; then
    INSTALL_DIR="/data/data/com.termux/files/home/simple-farm-integration-fase1"
else
    INSTALL_DIR="/data/data/com.termux/files/home/simplefarm"
fi

LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

# Adquire trava de CPU para evitar hibernacao do Android
termux-wake-lock 2>/dev/null &

echo "[$(date)] SimpleFarm Watchdog iniciado com sucesso em $INSTALL_DIR" >> "$LOG_DIR/watchdog.log"

FIRST_RUN=1

while true; do
    # 1. Verifica se o backend Python (porta 8000) esta respondendo com timeout seguro de 5s
    python3 -c "import socket; s = socket.socket(); s.settimeout(5); s.connect(('127.0.0.1', 8000)); s.close()" 2>/dev/null
    PYTHON_STATUS=$?

    if [ $PYTHON_STATUS -ne 0 ]; then
        echo "[$(date)] [ALERTA] Python backend (8000) indisponivel. Reiniciando..." >> "$LOG_DIR/watchdog.log"
        pkill -9 -f "python.*app.py" 2>/dev/null || true
        sleep 1
        cd "$INSTALL_DIR" || exit 1
        nohup python backend/app.py >> "$LOG_DIR/python.log" 2>&1 &
        echo "[$(date)] Python backend reiniciado (PID: $!)." >> "$LOG_DIR/watchdog.log"
        
        # Aguarda porta 8000 abrir (max 30s)
        WAIT_COUNT=0
        while ! python3 -c "import socket; s = socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 8000)); s.close()" 2>/dev/null; do
            sleep 2
            WAIT_COUNT=$((WAIT_COUNT + 1))
            if [ $WAIT_COUNT -gt 15 ]; then
                echo "[$(date)] [ERRO] Timeout aguardando porta 8000 abrir." >> "$LOG_DIR/watchdog.log"
                break
            fi
        done
        sleep 2
        am start -n com.android.browser/.BrowserActivity -a android.intent.action.VIEW -d http://127.0.0.1:8000/glass 2>/dev/null &
        FIRST_RUN=0
    elif [ "$FIRST_RUN" -eq 1 ]; then
        echo "[$(date)] Python backend pronto na inicializacao. Abrindo tela glass no navegador..." >> "$LOG_DIR/watchdog.log"
        sleep 2
        am start -n com.android.browser/.BrowserActivity -a android.intent.action.VIEW -d http://127.0.0.1:8000/glass 2>/dev/null &
        FIRST_RUN=0
    else
        # 2. Verifica se o navegador esta rodando (evita spam de intents se ele ja estiver aberto)
        if ! pgrep -f "com.android.browser" > /dev/null && ! pgrep -f "browser" > /dev/null; then
            echo "[$(date)] [INFO] Navegador fechado. Reabrindo tela glass..." >> "$LOG_DIR/watchdog.log"
            am start -n com.android.browser/.BrowserActivity -a android.intent.action.VIEW -d http://127.0.0.1:8000/glass 2>/dev/null &
        fi
    fi

    # 3. Verifica servidor Node.js/Fallback na porta 3000
    python3 -c "import socket; s = socket.socket(); s.settimeout(5); s.connect(('127.0.0.1', 3000)); s.close()" 2>/dev/null
    if [ $? -ne 0 ]; then
        if [ -f "$INSTALL_DIR/server.js" ]; then
            echo "[$(date)] [ALERTA] Node.js server (3000) desativado. Reiniciando..." >> "$LOG_DIR/watchdog.log"
            pkill -f "node.*server.js" 2>/dev/null || true
            cd "$INSTALL_DIR"
            nohup node "server.js" >> "$LOG_DIR/node.log" 2>&1 &
            echo "[$(date)] Node.js server reiniciado." >> "$LOG_DIR/watchdog.log"
            sleep 2
        fi
    fi

    sleep 15
done
