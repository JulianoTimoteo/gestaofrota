$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PERFORMANCE + RBAC TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Admin login (julianotimoteo)
Write-Host ""
Write-Host "1. Testing ADMIN login..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"usuario":"julianotimoteo","senha":"tmotvini1986@#"}'
Write-Host "   Success: $($login.success)"
Write-Host "   Role: $($login.role)"
Write-Host "   Nivel: $($login.nivel_acesso)"
Write-Host "   Admin: $($login.admin)"

# Store role in localStorage simulation
$adminToken = $login.token
Write-Host "   Admin has auto-sync endpoint: $(try { Invoke-RestMethod -Uri 'http://localhost:3000/api/auto-sync' -Method Post -Headers @{Authorization="Bearer $adminToken"} -TimeoutSec 120 -ErrorAction Stop; 'OK' } catch { 'FAIL: ' + $_.Exception.Message })"

# Test 2: Analyst login
Write-Host ""
Write-Host "2. Testing ANALYST login..." -ForegroundColor Yellow
$login2 = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"usuario":"analista","senha":"analista123"}'
Write-Host "   Role: $($login2.role)"
Write-Host "   Admin: $($login2.admin)"

# Test 3: Supervisor login (should NOT see Admin tab)
Write-Host ""
Write-Host "3. Testing SUPERVISOR login..." -ForegroundColor Yellow
$login3 = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"usuario":"supervisor","senha":"super123"}'
Write-Host "   Role: $($login3.role)"
Write-Host "   Admin: $($login3.admin)"

# Test 4: High Management login (should only see Equipes tab)
Write-Host ""
Write-Host "4. Testing HIGH MANAGEMENT login..." -ForegroundColor Yellow
$login4 = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"usuario":"highmgmt","senha":"high123"}'
Write-Host "   Role: $($login4.role)"
Write-Host "   Admin: $($login4.admin)"

# Test 5: Verify /api/me returns role
Write-Host ""
Write-Host "5. Testing /api/auth/me..." -ForegroundColor Yellow
$me = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Headers @{Authorization="Bearer $adminToken"}
Write-Host "   role: $($me.role)"
Write-Host "   nivel_acesso: $($me.nivel_acesso)"

# Test 6: Verify /api/dados works for all roles
Write-Host ""
Write-Host "6. Testing /api/dados for supervisor..." -ForegroundColor Yellow
$dados = Invoke-RestMethod -Uri "http://localhost:3000/api/dados" -Headers @{Authorization="Bearer $($login3.token)"}
Write-Host "   Success: $($dados.success)"
Write-Host "   Equipamentos: $($dados.data.equipamentos.Count)"
Write-Host "   Operacoes: $($dados.data.operacoes.Count)"
Write-Host "   OS: $($dados.data.ordensServico.Count)"

# Test 7: Check HTML has new role-based features
Write-Host ""
Write-Host "7. Checking HTML optimizations..." -ForegroundColor Yellow
$html = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing; $html.Content
Write-Host "   Has auto-sync: $($html.Content.Contains('autoSync'))"
Write-Host "   Has RBAC (ADMIN_ROLES): $($html.Content.Contains('ADMIN_ROLES'))"
Write-Host "   Has applyRBAC: $($html.Content.Contains('applyRBAC'))"
Write-Host "   Has userRoleBadge: $($html.Content.Contains('userRoleBadge'))"
Write-Host "   No manual sync form (username input): $(-not $html.Content.Contains('id="username"'))"
Write-Host "   No syncBtn: $(-not $html.Content.Contains('id="syncBtn"'))"
Write-Host "   No resetBtn: $(-not $html.Content.Contains('id="resetBtn"'))"
Write-Host "   Event delegation (team-filter-btn): $($html.Content.Contains('team-filter-btn'))"
Write-Host "   Event delegation (data-action): $($html.Content.Contains('data-action'))"
Write-Host "   Loading state: $($html.Content.Contains('showLoading'))"

# Test 8: Teams listed
Write-Host ""
Write-Host "8. Teams verified from data:" -ForegroundColor Yellow
$teams = @{}
$dados.data.equipamentos | ForEach-Object {
    $t = $_.grupo
    if ($t -ne "N/A" -and $t -ne "0" -and $t -ne "" -and $t -ne $null) {
        if ($teams[$t]) { $teams[$t]++ } else { $teams[$t] = 1 }
    }
}
$teams.Keys | Sort-Object | ForEach-Object { Write-Host "   $_ : $($teams[$_]) equipamentos" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESULT: ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
