# ============================================================
# SimpleFarm Integration — Watchdog de Auto-Recuperacao
# Roda a cada 5 minutos via Task Scheduler.
# Verifica se Python (8000) e Node.js (3000) estao online.
# Se nao, mata processos zumbis e reinicia ambos.
# ============================================================

$ProjectPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogFile     = "$ProjectPath\scripts\watchdog.log"
$StartBat    = "$ProjectPath\scripts\start_server.bat"
$Timestamp   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Log($msg) {
    $line = "[$Timestamp] $msg"
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    # Manter log com no maximo 500 linhas para nao crescer indefinidamente
    try {
        $lines = Get-Content $LogFile -ErrorAction SilentlyContinue
        if ($lines.Count -gt 500) {
            $lines[-400..-1] | Set-Content $LogFile
        }
    } catch {}
}

function Test-Port($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(2000, $false)
        $tcp.Close()
        return $success
    } catch {
        return $false
    }
}

function Kill-ZombieProcesses {
    # Mata processos Python/Node que possam estar travados
    Get-Process -Name "python", "pythonw" -ErrorAction SilentlyContinue | 
        Where-Object { $_.MainWindowTitle -eq "" -or $_.Responding -eq $false } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

# --- Verifica Python (porta 8000) ---
$pythonOk = Test-Port -port 8000

# --- Verifica Node.js (porta 3000) ---
$nodeOk = Test-Port -port 3000

Write-Log "Watchdog: Python=$( if ($pythonOk) {'OK'} else {'OFFLINE'} ) | Node=$( if ($nodeOk) {'OK'} else {'OFFLINE'} )"

# --- Se algum servidor esta fora, reinicia tudo ---
if (-not $pythonOk -or -not $nodeOk) {
    Write-Log "ALERTA: Servidor fora do ar! Iniciando protocolo de recuperacao..."

    # 1. Mata processos zumbis
    Kill-ZombieProcesses
    Start-Sleep -Seconds 2

    # 2. Verifica se o bat de inicio existe
    if (-not (Test-Path $StartBat)) {
        Write-Log "ERRO CRITICO: start_server.bat nao encontrado em $StartBat"
        exit 1
    }

    # 3. Reinicia via bat (oculto)
    $proc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c `"$StartBat`"" `
        -WindowStyle Hidden `
        -PassThru `
        -ErrorAction SilentlyContinue

    if ($proc) {
        Write-Log "Servidor reiniciado com PID $($proc.Id). Aguardando 20s para verificacao..."
        Start-Sleep -Seconds 20

        # 4. Confirma se subiu
        $pythonOkPost = Test-Port -port 8000
        $nodeOkPost   = Test-Port -port 3000
        Write-Log "Pos-recuperacao: Python=$( if ($pythonOkPost) {'OK'} else {'AINDA OFFLINE'} ) | Node=$( if ($nodeOkPost) {'OK'} else {'AINDA OFFLINE'} )"
    } else {
        Write-Log "ERRO: Nao foi possivel iniciar o processo de recuperacao."
    }
} else {
    Write-Log "Servidores saudaveis. Nenhuma acao necessaria."
}
