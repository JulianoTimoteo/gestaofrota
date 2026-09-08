@echo off
TITLE SimpleFarm Integration Server (Python + Node)
CD /D "%~dp0\.."

REM ============================================================
REM  SimpleFarm Integration — Inicializador Autonomo
REM  Inicia Python (porta 8000) e Node.js (porta 3000)
REM  com loop de autorrecuperacao para ambos.
REM ============================================================

echo ===================================================
echo  SimpleFarm Integration Server — Inicio Autonomo
echo  Data/Hora: %date% %time%
echo ===================================================
echo.

REM --- Descobre o IP local para exibir ao usuario ---
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
    )
)

echo [INFO] IP do Servidor: %LOCAL_IP%
echo [INFO] Frontend (tablet): http://%LOCAL_IP%:3000
echo [INFO] API Backend:       http://%LOCAL_IP%:8000
echo.

REM --- Inicia Python Backend em segundo plano (loop interno) ---
echo [1/2] Iniciando Python backend (porta 8000)...
start "SimpleFarm-Python" /MIN cmd /c "^
:pyloop ^
 echo Iniciando Python backend... ^
 python backend\app.py ^
 echo Python parou. Reiniciando em 5s... ^
 timeout /t 5 /nobreak ^>nul ^
 goto pyloop"

REM --- Aguarda Python subir antes de iniciar o Node ---
echo [INFO] Aguardando Python inicializar (10s)...
timeout /t 10 /nobreak >nul

REM --- Inicia Node.js Frontend em loop de autorrecuperacao ---
echo [2/2] Iniciando Node.js server (porta 3000)...
echo.

:nodeloop
echo ===================================================
echo  Node.js Server — %date% %time%
echo ===================================================
node "Farra_donuts\Farra\server.js"
echo.
echo [AVISO] Node.js parou. Reiniciando em 5 segundos...
timeout /t 5 /nobreak >nul
goto nodeloop
