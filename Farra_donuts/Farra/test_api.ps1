$body = @{ usuario = 'admin'; senha = 'farra@2026' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
$token = $login.token
Write-Host "Token OK: $($token.Substring(0,20))..."

$dados = Invoke-RestMethod -Uri 'http://localhost:3000/api/dados' -Headers @{Authorization="Bearer $token"}
Write-Host "Equipamentos: $($dados.data.equipamentos.Count)"
Write-Host "OS: $($dados.data.ordensServico.Count)"
Write-Host "Operacoes: $($dados.data.operacoes.Count)"
Write-Host "Ultima sync: $($dados.data.ultimaSincronizacao)"

# Mostrar uma amostra dos dados
if ($dados.data.equipamentos.Count -gt 0) {
    Write-Host "`n=== AMOSTRA EQUIPAMENTOS ==="
    $dados.data.equipamentos | Select-Object -First 3 | ConvertTo-Json
}

if ($dados.data.ordensServico.Count -gt 0) {
    Write-Host "`n=== AMOSTRA OS ==="
    $dados.data.ordensServico | Select-Object -First 2 | ConvertTo-Json
}
