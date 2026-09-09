#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# SimpleFarm Integration — Automatic Watchdog & Restart Script
# Continuously checks TCP port 8000 (Python) and port 3000 (Node.js)
# ============================================================

export HOME="/data/data/com.termux/files/home"
export PATH="/data/data/com.termux/files/usr/bin:$PATH"
export LD_LIBRARY_PATH="/data/data/com.termux/files/usr/lib"
export PREFIX="/data/data/com.termux/files/usr"

INSTALL_DIR="/data/data/com.termux/files/home/simplefarm"
LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

# Acquire high-performance wake lock to prevent Android CPU sleep
termux-wake-lock 2>/dev/null &

echo "[$(date)] SimpleFarm Watchdog iniciado com sucesso." >> "$LOG_DIR/watchdog.log"

FIRST_RUN=1

while true; do
    # Check Python backend (TCP port 8000)
    python3 -c "import socket; s = socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 8000)); s.close()" 2>/dev/null
    PYTHON_STATUS=$?

    if [ $PYTHON_STATUS -ne 0 ]; then
        echo "[$(date)] [ALERTA] Python backend (8000) desativado. Reiniciando..." >> "$LOG_DIR/watchdog.log"
        pkill -f "python.*app.py" 2>/dev/null || true
        cd "$INSTALL_DIR"
        nohup python backend/app.py >> "$LOG_DIR/python.log" 2>&1 &
        echo "[$(date)] Python backend reiniciado." >> "$LOG_DIR/watchdog.log"
        
        # Wait until port 8000 is open before refreshing browser
        while ! python3 -c "import socket; s = socket.socket(); s.settimeout(1); s.connect(('127.0.0.1', 8000)); s.close()" 2>/dev/null; do
            sleep 2
        done
        sleep 2
        am start -n com.android.browser/.BrowserActivity -a android.intent.action.VIEW -d http://127.0.0.1:8000/glass 2>/dev/null &
        (sleep 4; input tap 955 245 2>/dev/null) &
        FIRST_RUN=0
    elif [ "$FIRST_RUN" -eq 1 ]; then
        echo "[$(date)] Python backend pronto na inicialização. Abrindo tela glass..." >> "$LOG_DIR/watchdog.log"
        sleep 2
        am start -n com.android.browser/.BrowserActivity -a android.intent.action.VIEW -d http://127.0.0.1:8000/glass 2>/dev/null &
        (sleep 4; input tap 955 245 2>/dev/null) &
        FIRST_RUN=0
    fi

    # Check Node.js server (TCP port 3000)
    python3 -c "import socket; s = socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 3000)); s.close()" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "[$(date)] [ALERTA] Node.js server (3000) desativado. Reiniciando..." >> "$LOG_DIR/watchdog.log"
        pkill -f "node.*server.js" 2>/dev/null || true
        cd "$INSTALL_DIR"
        nohup node "server.js" >> "$LOG_DIR/node.log" 2>&1 &
        echo "[$(date)] Node.js server reiniciado." >> "$LOG_DIR/watchdog.log"
        sleep 3
    fi

    sleep 15
done
