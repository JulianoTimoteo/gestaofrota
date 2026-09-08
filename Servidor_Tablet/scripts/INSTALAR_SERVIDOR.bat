@echo off
TITLE SimpleFarm — Instalador do Servidor Autonomo
CD /D "%~dp0"

echo.
echo =====================================================
echo   SimpleFarm Integration — INSTALADOR ONE-CLICK
echo   Servidor 100%% Autonomo (sem cabo USB, sem notebook)
echo =====================================================
echo.

REM --- Verifica se esta rodando como Administrador ---
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERRO] Este instalador precisa ser executado como ADMINISTRADOR!
    echo.
    echo  SOLUCAO: Clique com o botao DIREITO neste arquivo
    echo           e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

echo [OK] Rodando como Administrador.
echo.

REM --- Instala dependencias Node.js se necessario ---
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERRO] Node.js nao encontrado! Instale em: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado.

REM --- Instala dependencias Python se necessario ---
echo [2/4] Verificando Python...
python --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERRO] Python nao encontrado! Instale em: https://python.org
    pause
    exit /b 1
)
echo [OK] Python encontrado.

REM --- Instala pacotes Node.js se necessario ---
echo [3/4] Verificando dependencias Node.js (node_modules)...
if not exist "..\Farra_donuts\Farra\node_modules" (
    echo Instalando pacotes Node.js...
    cd /D "..\Farra_donuts\Farra"
    npm install --silent
    cd /D "%~dp0"
)
echo [OK] Dependencias Node.js prontas.

REM --- Instala pacotes Python se necessario ---
echo [4/4] Verificando dependencias Python...
pip install flask flask-cors requests urllib3 psutil pyjwt python-dotenv >nul 2>&1
echo [OK] Dependencias Python prontas.

echo.
echo =====================================================
echo   Registrando servidor no Agendador de Tarefas...
echo =====================================================
echo.

REM --- Executa o script PowerShell de instalacao ---
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0install_windows_task.ps1"

echo.
echo =====================================================
echo   INSTALACAO CONCLUIDA!
echo =====================================================
echo.
echo   O servidor SimpleFarm agora:
echo   - Inicia automaticamente quando o Windows liga
echo   - Reinicia automaticamente se cair (watchdog 5min)
echo   - Funciona sem cabo USB conectado ao tablet
echo   - O tablet acessa via Wi-Fi (veja o IP acima)
echo.
echo   PROXIMOS PASSOS:
echo   1. Anote o IP exibido acima
echo   2. No tablet, abra o navegador e acesse:
echo      http://IP_ANOTADO:3000
echo   3. Desconecte o cabo USB — tudo continua funcionando!
echo.
pause
