@echo off
chcp 65001 >nul
:: ====================================================
::   KUNHWA WMS CONNECTION FIXER (ULTIMATE V2)
:: ====================================================

:checkAdmin
    echo [1/4] Checking Administrator privileges...
    net session >nul 2>&1
    if %errorLevel% == 0 (
        goto :runCommands
    ) else (
        goto :getAdmin
    )

:getAdmin
    echo [Info] Requesting Administrator rights...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:runCommands
    echo.
    echo [2/4] Changing Network Profile to PRIVATE...
    :: This command finds ALL active network connections and sets them to Private
    powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
    
    echo.
    echo [3/4] Opening Firewall Ports...
    :: Remove old rules first to be clean
    netsh advfirewall firewall delete rule name="Kunhwa WMS Server" >nul 2>&1
    netsh advfirewall firewall delete rule name="mDNS Responder" >nul 2>&1
    netsh advfirewall firewall delete rule name="Node.js Server" >nul 2>&1

    :: Add Rules (Force Allow)
    netsh advfirewall firewall add rule name="Kunhwa WMS Server" dir=in action=allow protocol=TCP localport=3001 profile=any
    netsh advfirewall firewall add rule name="mDNS Responder" dir=in action=allow protocol=UDP localport=5353 profile=any

    echo.
    echo [4/4] Verifying Configuration...
    echo ---------------------------------------------------
    powershell -Command "Get-NetConnectionProfile"
    echo ---------------------------------------------------
    echo.
    echo [SUCCESS] If 'NetworkCategory' above says 'Private', you are good to go!
    echo.
    echo You can close this window and try connecting from your phone.
    echo Address: https://kh-rnd.local:3001
    echo.
    pause
