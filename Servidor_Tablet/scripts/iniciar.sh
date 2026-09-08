#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# SimpleFarm Integration — Script de Inicializacao Autonoma
# ============================================================

export HOME="/data/data/com.termux/files/home"
export PATH="/data/data/com.termux/files/usr/bin:$PATH"

INSTALL_DIR="/data/data/com.termux/files/home/simplefarm"
LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

# Mata servidores anteriores se houver
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2

# Adquire WakeLock para evitar suspensao de CPU no Android
termux-wake-lock 2>/dev/null &

# Inicia Python backend (porta 8000)
cd "$INSTALL_DIR"
echo "[$(date)] Iniciando Python backend (porta 8000)..." >> "$LOG_DIR/python.log"
nohup python backend/app.py >> "$LOG_DIR/python.log" 2>&1 &
PYTHON_PID=$!
echo "Python PID: $PYTHON_PID"

# Aguarda Python backend estabilizar
sleep 5

# Inicia Node.js server (porta 3000)
echo "[$(date)] Iniciando Node.js server (porta 3000)..." >> "$LOG_DIR/node.log"
nohup node "Farra_donuts/Farra/server.js" >> "$LOG_DIR/node.log" 2>&1 &
NODE_PID=$!
echo "Node.js PID: $NODE_PID"

sleep 3
echo "[$(date)] Servidores SimpleFarm rodando com sucesso." >> "$LOG_DIR/boot.log"
