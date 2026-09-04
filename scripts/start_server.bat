@echo off
TITLE SimpleFarm Integration Server
CD /D "%~dp0\.."

:loop
echo ===================================================
echo Iniciando Servidor SimpleFarm Integration...
echo Data/Hora: %date% %time%
echo ===================================================

python backend/app.py

echo.
echo [AVISO] O servidor parou ou caiu. Reiniciando em 5 segundos...
timeout /t 5 /nobreak >nul
goto loop
