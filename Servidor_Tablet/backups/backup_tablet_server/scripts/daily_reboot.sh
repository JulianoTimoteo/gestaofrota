#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# SimpleFarm Integration — Daily Automatic Reboot Daemon (03:00 AM)
# Clears memory, cache, and reboots tablet every day at 03:00 AM
# ============================================================

LOG_DIR="/data/data/com.termux/files/home/simplefarm_logs"
mkdir -p "$LOG_DIR"

echo "[$(date)] Daemon de Reboot Diario (03:00 AM) iniciado." >> "$LOG_DIR/daily_reboot.log"

while true; do
    CURRENT_TIME=$(date +%H:%M)
    if [ "$CURRENT_TIME" = "03:00" ]; then
        echo "[$(date)] Horario de manutencao 03:00 AM atingido. Iniciando reboot e limpeza..." >> "$LOG_DIR/daily_reboot.log"
        sleep 5
        /system/bin/reboot 2>/dev/null || reboot 2>/dev/null
        sleep 60
    fi
    sleep 30
done
