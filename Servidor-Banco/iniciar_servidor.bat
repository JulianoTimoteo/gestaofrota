@echo off
title Servidor SimpleFarm Desktop
color 0A
cd /d "%~dp0"
echo ========================================================
echo   SIMPLEFARM DESKTOP - CENTRAL DE ORDENS DE SERVICO
echo   Usina Pitangueiras - Monitoramento Local
echo ========================================================
echo.
echo [*] Iniciando o servidor web e o robô de sincronizacao...
echo [*] Acesse no navegador: http://127.0.0.1:8000
echo.

start "" "http://127.0.0.1:8000"
python app.py
pause
