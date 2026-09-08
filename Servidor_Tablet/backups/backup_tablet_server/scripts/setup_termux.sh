#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# SimpleFarm Integration — Script de Setup no Termux (Android)
# Execute este script UMA VEZ no Termux do tablet
#
# Como usar:
#   1. Abra o Termux no tablet
#   2. Execute: bash /sdcard/simplefarm/setup_termux.sh
# ============================================================

set -e  # Para se der erro

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "============================================="
echo "  SimpleFarm Integration — Setup Termux"
echo "  Servidor 100% Autonomo no Tablet Android"
echo "============================================="
echo -e "${NC}"

# Pasta de instalacao no tablet
INSTALL_DIR="$HOME/simplefarm"
SDCARD_DIR="/sdcard/simplefarm"

echo -e "${YELLOW}[1/7] Atualizando repositorios do Termux...${NC}"
pkg update -y 2>/dev/null || true
pkg upgrade -y 2>/dev/null || true

echo -e "${YELLOW}[2/7] Instalando Node.js, Python3 e dependencias...${NC}"
pkg install -y nodejs python3 sqlite git openssl wget curl 2>/dev/null || true

echo -e "${YELLOW}[3/7] Instalando pacotes Python...${NC}"
pip install --quiet --upgrade pip 2>/dev/null || true
pip install --quiet flask flask-cors requests urllib3 psutil python-dotenv pyjwt 2>/dev/null || true
# beautifulsoup4 e lxml para scraping (podem demorar)
pip install --quiet beautifulsoup4 lxml 2>/dev/null || true

echo -e "${YELLOW}[4/7] Copiando arquivos do SDCard para Termux...${NC}"
mkdir -p "$INSTALL_DIR/backend"
mkdir -p "$INSTALL_DIR/Farra_donuts/Farra"
mkdir -p "$INSTALL_DIR/frontend"
mkdir -p "$INSTALL_DIR/config"

# Copia arquivos principais
if [ -d "$SDCARD_DIR" ]; then
    cp -rf "$SDCARD_DIR/backend/"*  "$INSTALL_DIR/backend/"  2>/dev/null || true
    cp -rf "$SDCARD_DIR/Farra_donuts/Farra/"* "$INSTALL_DIR/Farra_donuts/Farra/" 2>/dev/null || true
    cp -rf "$SDCARD_DIR/frontend/"* "$INSTALL_DIR/frontend/" 2>/dev/null || true
    cp -f  "$SDCARD_DIR/.env" "$INSTALL_DIR/.env" 2>/dev/null || true
    echo -e "${GREEN}  [OK] Arquivos copiados do SDCard.${NC}"
else
    echo -e "${RED}  [AVISO] Pasta /sdcard/simplefarm nao encontrada.${NC}"
    echo -e "         Copie a pasta do projeto para /sdcard/simplefarm/ e execute novamente."
fi

echo -e "${YELLOW}[5/7] Instalando dependencias Node.js...${NC}"
if [ -f "$INSTALL_DIR/Farra_donuts/Farra/package.json" ]; then
    cd "$INSTALL_DIR/Farra_donuts/Farra"
    npm install --silent 2>/dev/null || npm install 2>/dev/null || true
    echo -e "${GREEN}  [OK] Node modules instalados.${NC}"
fi

echo -e "${YELLOW}[6/7] Configurando banco de dados no SDCard...${NC}"
# O banco fica no SDCard para persistir mesmo se o Termux for resetado
mkdir -p /sdcard/simplefarm_data/

# Cria .env para apontar o banco para o SDCard
if [ ! -f "$INSTALL_DIR/.env" ]; then
    cat > "$INSTALL_DIR/.env" << 'ENVEOF'
# SimpleFarm — Variaveis de Ambiente (Tablet Autonomo)
SF_DB_PATH=/sdcard/simplefarm_data/meus_banco.db
AUTH_ENABLED=false
# Configure suas credenciais:
# SF_BASE_URL=https://simplefarm.usinapitangueiras.com.br:8050
# SF_USERNAME=julianotimoteo
# SF_PASSWORD=SuaSenha
ENVEOF
    echo -e "${GREEN}  [OK] Arquivo .env criado.${NC}"
fi

# Copia banco existente se disponivel
if [ -f "/sdcard/meus_banco.db" ] && [ ! -f "/sdcard/simplefarm_data/meus_banco.db" ]; then
    cp /sdcard/meus_banco.db /sdcard/simplefarm_data/meus_banco.db
    echo -e "${GREEN}  [OK] Banco de dados migrado para /sdcard/simplefarm_data/${NC}"
fi

echo -e "${YELLOW}[7/7] Configurando inicializacao automatica (termux-boot)...${NC}"
pkg install -y termux-boot 2>/dev/null || true
mkdir -p "$HOME/.termux/boot"

cat > "$HOME/.termux/boot/start_simplefarm.sh" << 'BOOTEOF'
#!/data/data/com.termux/files/usr/bin/bash
# SimpleFarm — Auto-inicio no boot do Android

INSTALL_DIR="/data/data/com.termux/files/home/simplefarm"
LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

# Aguarda sistema estabilizar
sleep 15

# Adquire wakelock para evitar que Android suspenda o Termux
termux-wake-lock 2>/dev/null &

# Inicia Python backend (porta 8000)
cd "$INSTALL_DIR"
while true; do
    echo "[$(date)] Iniciando Python backend..." >> "$LOG_DIR/python.log"
    python backend/app.py >> "$LOG_DIR/python.log" 2>&1
    echo "[$(date)] Python parou. Reiniciando em 10s..." >> "$LOG_DIR/python.log"
    sleep 10
done &

# Aguarda Python inicializar
sleep 12

# Inicia Node.js server (porta 3000)
while true; do
    echo "[$(date)] Iniciando Node.js server..." >> "$LOG_DIR/node.log"
    node "$INSTALL_DIR/Farra_donuts/Farra/server.js" >> "$LOG_DIR/node.log" 2>&1
    echo "[$(date)] Node.js parou. Reiniciando em 10s..." >> "$LOG_DIR/node.log"
    sleep 10
done &

echo "[$(date)] SimpleFarm iniciado em background." >> "$LOG_DIR/boot.log"
BOOTEOF

chmod +x "$HOME/.termux/boot/start_simplefarm.sh"
echo -e "${GREEN}  [OK] Auto-inicio configurado.${NC}"

# Cria script de inicio manual
cat > "$INSTALL_DIR/iniciar.sh" << 'STARTEOF'
#!/data/data/com.termux/files/usr/bin/bash
# SimpleFarm — Iniciar manualmente

export HOME="/data/data/com.termux/files/home"
export PATH="/data/data/com.termux/files/usr/bin:$PATH"

INSTALL_DIR="/data/data/com.termux/files/home/simplefarm"
LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

# Mata servidores anteriores
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2

# Wakelock
termux-wake-lock 2>/dev/null &

# Inicia Python backend
cd "$INSTALL_DIR"
echo "[$(date)] Iniciando Python backend (porta 8000)..."
nohup python backend/app.py > "$LOG_DIR/python.log" 2>&1 &
PYTHON_PID=$!
echo "Python PID: $PYTHON_PID"

# Aguarda Python
sleep 10

# Inicia Node.js
echo "[$(date)] Iniciando Node.js server (porta 3000)..."
nohup node "Farra_donuts/Farra/server.js" > "$LOG_DIR/node.log" 2>&1 &
NODE_PID=$!
echo "Node.js PID: $NODE_PID"

sleep 3

# Exibe IPs disponiveis
echo ""
echo "============================================="
echo "  SERVIDORES INICIADOS!"
echo "============================================="
echo ""
# IP do WiFi
WIFI_IP=$(ip route get 1 | awk '{print $7}' | head -1 2>/dev/null || hostname -I | awk '{print $1}')
echo "  Acesse pelo navegador:"
echo "  http://$WIFI_IP:3000   (Frontend)"
echo "  http://$WIFI_IP:8000   (API Python)"
echo ""
echo "  Logs: $LOG_DIR/"
echo ""
STARTEOF

chmod +x "$INSTALL_DIR/iniciar.sh"

# Cria script de parada
cat > "$INSTALL_DIR/parar.sh" << 'STOPEOF'
#!/data/data/com.termux/files/usr/bin/bash
pkill -f "python.*app.py" 2>/dev/null && echo "Python parado." || echo "Python nao estava rodando."
pkill -f "node.*server.js" 2>/dev/null && echo "Node.js parado." || echo "Node.js nao estava rodando."
termux-wake-unlock 2>/dev/null || true
echo "Servidores parados."
STOPEOF

chmod +x "$INSTALL_DIR/parar.sh"

# Cria script de status
cat > "$INSTALL_DIR/status.sh" << 'STATUSEOF'
#!/data/data/com.termux/files/usr/bin/bash
echo "=== Status SimpleFarm ==="
if pgrep -f "python.*app.py" > /dev/null; then
    echo "  Python (8000): RODANDO"
else
    echo "  Python (8000): PARADO"
fi
if pgrep -f "node.*server.js" > /dev/null; then
    echo "  Node.js (3000): RODANDO"
else
    echo "  Node.js (3000): PARADO"
fi
WIFI_IP=$(ip route get 1 | awk '{print $7}' | head -1 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "  URL do servidor: http://$WIFI_IP:3000"
echo "========================="
STATUSEOF

chmod +x "$INSTALL_DIR/status.sh"

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  SETUP CONCLUIDO COM SUCESSO!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "  Para iniciar os servidores AGORA:"
echo -e "    ${CYAN}bash $INSTALL_DIR/iniciar.sh${NC}"
echo ""
echo -e "  Para ver o status:"
echo -e "    ${CYAN}bash $INSTALL_DIR/status.sh${NC}"
echo ""
echo -e "  Para parar:"
echo -e "    ${CYAN}bash $INSTALL_DIR/parar.sh${NC}"
echo ""
echo -e "  ${YELLOW}IMPORTANTE:${NC} No app do Termux, va em:"
echo -e "  Configuracoes → Notifications → Ative para o Termux"
echo -e "  Isso evita que o Android mate o servidor em background."
echo ""
