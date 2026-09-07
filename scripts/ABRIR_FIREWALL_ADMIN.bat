@echo off
REM Executar este arquivo como ADMINISTRADOR
REM Clique direito -> "Executar como administrador"

echo Abrindo portas 3000 e 8000 no Firewall do Windows...

netsh advfirewall firewall delete rule name="SimpleFarm_Node_3000" >nul 2>&1
netsh advfirewall firewall delete rule name="SimpleFarm_Python_8000" >nul 2>&1

netsh advfirewall firewall add rule name="SimpleFarm_Node_3000"   dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SimpleFarm_Python_8000" dir=in action=allow protocol=TCP localport=8000

echo.
echo ==============================
echo  Portas 3000 e 8000 ABERTAS!
echo  Tablet pode acessar o servidor via Wi-Fi agora.
echo ==============================
pause
