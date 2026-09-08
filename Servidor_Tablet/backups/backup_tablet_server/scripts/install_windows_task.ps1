# ============================================================
# SimpleFarm Integration — Instalador de Tarefa Agendada
# Executa no boot do Windows (sem janela, sem usuario logado)
#
# COMO USAR: Clique direito → "Executar com PowerShell"
#            OU use o INSTALAR_SERVIDOR.bat como Admin
# ============================================================

$TaskName      = "SimpleFarm_Integration_Server"
$WatchdogTask  = "SimpleFarm_Watchdog"
$ProjectPath   = Resolve-Path "$PSScriptRoot\.."
$VbsPath       = "$ProjectPath\scripts\run_background.vbs"
$WatchdogPath  = "$ProjectPath\scripts\check_and_restart.ps1"

# --- Validacoes ---
if (-not (Test-Path $VbsPath)) {
    Write-Error "ERRO: Arquivo nao encontrado: $VbsPath"
    exit 1
}
if (-not (Test-Path $WatchdogPath)) {
    Write-Warning "Watchdog nao encontrado ($WatchdogPath). Continuando sem ele."
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SimpleFarm — Instalacao de Servico Windows" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# TAREFA 1: Servidor principal (boot do Windows)
# ============================================================
Write-Host "[1/3] Configurando tarefa de inicializacao: $TaskName ..." -ForegroundColor Yellow

# Remove versao antiga se existir
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Acao: executa o VBS (que lanca ambos os servidores sem janela)
$Action = New-ScheduledTaskAction `
    -Execute "wscript.exe" `
    -Argument "`"$VbsPath`""

# Trigger: na inicializacao do Windows + delay de 45s para Wi-Fi conectar
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Trigger.Delay = "PT45S"  # PT45S = 45 segundos de delay pos-boot

# Configuracoes robustas
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 2) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -MultipleInstances IgnoreNew

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -User "NT AUTHORITY\SYSTEM" `
        -RunLevel Highest | Out-Null
    Write-Host "  [OK] Tarefa '$TaskName' registrada para SYSTEM (boot automatico)." -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Sem permissao SYSTEM. Registrando para usuario atual..." -ForegroundColor Yellow
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -RunLevel Highest | Out-Null
    Write-Host "  [OK] Tarefa '$TaskName' registrada para usuario atual." -ForegroundColor Green
}

# ============================================================
# TAREFA 2: Watchdog (a cada 5 minutos)
# ============================================================
if (Test-Path $WatchdogPath) {
    Write-Host "[2/3] Configurando Watchdog (verificacao a cada 5 min): $WatchdogTask ..." -ForegroundColor Yellow

    Unregister-ScheduledTask -TaskName $WatchdogTask -Confirm:$false -ErrorAction SilentlyContinue

    $WatchAction = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$WatchdogPath`""

    # Cron: a cada 5 minutos
    $WatchTrigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)

    $WatchSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 4)

    try {
        Register-ScheduledTask `
            -TaskName $WatchdogTask `
            -Action $WatchAction `
            -Trigger $WatchTrigger `
            -Settings $WatchSettings `
            -User "NT AUTHORITY\SYSTEM" `
            -RunLevel Highest | Out-Null
        Write-Host "  [OK] Watchdog '$WatchdogTask' registrado (a cada 5 min)." -ForegroundColor Green
    } catch {
        Write-Host "  [AVISO] Watchdog sem permissao SYSTEM. Registrando para usuario atual..." -ForegroundColor Yellow
        Register-ScheduledTask `
            -TaskName $WatchdogTask `
            -Action $WatchAction `
            -Trigger $WatchTrigger `
            -Settings $WatchSettings `
            -RunLevel Highest | Out-Null
        Write-Host "  [OK] Watchdog registrado para usuario atual." -ForegroundColor Green
    }
} else {
    Write-Host "[2/3] Watchdog pulado (arquivo nao encontrado)." -ForegroundColor DarkGray
}

# ============================================================
# TAREFA 3: Liberar portas no Firewall do Windows
# ============================================================
Write-Host "[3/3] Liberando portas no Firewall do Windows (3000 e 8000)..." -ForegroundColor Yellow

try {
    New-NetFirewallRule -DisplayName "SimpleFarm Node.js (3000)"   -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "SimpleFarm Python API (8000)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  [OK] Portas 3000 e 8000 liberadas no Firewall." -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Nao foi possivel configurar o Firewall automaticamente." -ForegroundColor Yellow
    Write-Host "  Execute manualmente como Admin:" -ForegroundColor Yellow
    Write-Host "  netsh advfirewall firewall add rule name='SimpleFarm 3000' dir=in action=allow protocol=TCP localport=3000" -ForegroundColor DarkGray
    Write-Host "  netsh advfirewall firewall add rule name='SimpleFarm 8000' dir=in action=allow protocol=TCP localport=8000" -ForegroundColor DarkGray
}

# ============================================================
# Iniciar imediatamente
# ============================================================
Write-Host ""
Write-Host "Iniciando servidor agora..." -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Exibe o IP local para configurar no tablet
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

$IPs = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" }).IPAddress
Write-Host "  IP(s) deste computador:" -ForegroundColor White
foreach ($ip in $IPs) {
    Write-Host "    http://$($ip):3000  ← use este no tablet!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  O servidor inicia automaticamente no boot do Windows." -ForegroundColor Green
Write-Host "  Watchdog verifica e reinicia a cada 5 minutos se cair." -ForegroundColor Green
Write-Host "  O tablet nao depende do cabo USB para nada." -ForegroundColor Green
Write-Host ""
Write-Host "  DICA: Configure um IP fixo para este computador no roteador" -ForegroundColor Cyan
Write-Host "  para que o IP nao mude e o tablet sempre encontre o servidor." -ForegroundColor Cyan
Write-Host ""
