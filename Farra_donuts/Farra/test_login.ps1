$body = @{ usuario = 'admin'; senha = 'farra@2026' } | ConvertTo-Json
$result = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
$result | ConvertTo-Json
