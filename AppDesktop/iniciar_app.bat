@echo off
title Gestao de Frota - App Desktop
cd /d "%~dp0"
echo ========================================================
echo   INICIANDO GESTAO DE FROTA DESKTOP (USINA PITANGUEIRAS)
echo ========================================================
echo Abrindo aplicativo e sincronizador de frota...
echo.
start "" pythonw "%~dp0main.py"
exit
