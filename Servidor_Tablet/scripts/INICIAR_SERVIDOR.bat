@echo off
REM ============================================================
REM  SimpleFarm — Inicializador Rapido (duplo clique)
REM  Inicia Python (8000) + Node.js (3000) em background
REM ============================================================
TITLE SimpleFarm — Iniciando...
CD /D "%~dp0\.."

echo Verificando se os servidores ja estao rodando...

REM Testa se Python ja esta na porta 8000
powershell -Command "try { $null = (New-Object Net.Sockets.TcpClient('127.0.0.1', 8000)); Write-Host 'PYTHON_UP' } catch { Write-Host 'PYTHON_DOWN' }" > %TEMP%\sf_check.txt 2>&1
findstr /C:"PYTHON_UP" %TEMP%\sf_check.txt >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Python ja esta rodando na porta 8000.
) else (
    echo [INFO] Iniciando Python backend ^(porta 8000^)...
    start "SF-Python" /MIN cmd /c "cd /D "%~dp0.." && :py & python backend\app.py & timeout /t 5 /nobreak >nul & goto py"
    timeout /t 8 /nobreak >nul
)

REM Testa se Node ja esta na porta 3000
powershell -Command "try { $null = (New-Object Net.Sockets.TcpClient('127.0.0.1', 3000)); Write-Host 'NODE_UP' } catch { Write-Host 'NODE_DOWN' }" > %TEMP%\sf_check2.txt 2>&1
findstr /C:"NODE_UP" %TEMP%\sf_check2.txt >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Node.js ja esta rodando na porta 3000.
) else (
    echo [INFO] Iniciando Node.js server ^(porta 3000^)...
    start "SF-Node" /MIN cmd /c "cd /D "%~dp0..\Farra_donuts\Farra" && :nd & node server.js & timeout /t 5 /nobreak >nul & goto nd"
    timeout /t 3 /nobreak >nul
)

REM Exibe IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set IP=%%b
)

echo.
echo ============================================================
echo   SIMPLEFARM INICIADO COM SUCESSO!
echo.
echo   Abra no tablet (Wi-Fi): http://%IP%:8000/glass
echo   Frontend alternativo:   http://%IP%:3000
echo ============================================================
echo.

del %TEMP%\sf_check.txt 2>nul
del %TEMP%\sf_check2.txt 2>nul
