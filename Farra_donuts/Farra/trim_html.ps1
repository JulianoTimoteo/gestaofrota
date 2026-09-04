$path = 'c:\Users\julianotimoteo\Downloads\simple-farm-integration-fase1\Farra_donuts\Farra\index.html'
$lines = Get-Content $path -Encoding UTF8
$marker = '</html>'
$cutLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq $marker) {
        $cutLine = $i
        break
    }
}
if ($cutLine -lt 0) {
    Write-Host "ERROR: </html> not found"
    exit 1
}
$clean = $lines[0..$cutLine]
[System.IO.File]::WriteAllLines($path, $clean, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Cut at line $($cutLine+1) of $($lines.Count). Now $($clean.Count) lines."
