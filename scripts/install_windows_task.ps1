# Script para Registrar o Servidor SimpleFarm no Agendador de Tarefas do Windows (Task Scheduler)
# Executa automaticamente no boot do Windows em segundo plano (sem janela e sem depender de login de notebook)

$TaskName = "SimpleFarm_Integration_Server"
$ProjectPath = Resolve-Path "$PSScriptRoot\.."
$VbsPath = "$ProjectPath\scripts\run_background.vbs"

if (-not (Test-Path $VbsPath)) {
    Write-Error "Arquivo $VbsPath nao encontrado."
    exit 1
}

Write-Host "Configurando tarefa agendada: $TaskName..." -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPath`""
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 365)

try {
    # Remove versao antiga se existir
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

    # Registra nova tarefa para iniciar no Boot
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest | Out-Null
    Write-Host "[SUCESSO] Tarefa '$TaskName' registrada para iniciar automaticamente no Boot do Windows!" -ForegroundColor Green
    Write-Host "O servidor rodara 24h/7d em segundo plano, 100% independente de usuario ou notebook." -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Nao foi possivel registrar como SYSTEM (requer permissao de Admin). Registrando para usuario atual..." -ForegroundColor Yellow
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest | Out-Null
    Write-Host "[SUCESSO] Tarefa '$TaskName' registrada para o usuario atual!" -ForegroundColor Green
}

# Pergunta/Executa a tarefa imediatamente
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host "Servidor iniciado em segundo plano!" -ForegroundColor Green
