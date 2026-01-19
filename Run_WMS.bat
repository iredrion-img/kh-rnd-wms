@echo off
:: Batch script to set Firewall rules and open Kunhwa WMS
:: This script checks for Admin privileges and auto-elevates if needed.

:checkAdmin
    echo [Check] Requesting Administrator privileges...
    net session >nul 2>&1
    if %errorLevel% == 0 (
        goto :runCommands
    ) else (
        goto :getAdmin
    )

:getAdmin
    echo [Info] This script needs to run as Administrator to update Firewall settings.
    echo [Info] Please click 'Yes' in the User Account Control window.
    
    :: Create a temporary VBScript to re-launch this batch as Admin
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:runCommands
    :: Fix: Set working directory to project root explicitly
    cd /d c:\KH_RnD

    echo.
    echo ====================================================
    echo        Configuring Windows Firewall for WMS
    echo ====================================================
    
    :: Open Port 3001 (TCP) for Node.js Server
    netsh advfirewall firewall show rule name="Kunhwa WMS Server" >nul
    if %errorLevel% neq 0 (
        echo [Setup] Opening Port 3001 (TCP)...
        netsh advfirewall firewall add rule name="Kunhwa WMS Server" dir=in action=allow protocol=TCP localport=3001 profile=any
    ) else (
        echo [Skip] Port 3001 is already configured.
    )

    :: Open Port 5353 (UDP) for mDNS (kh-rnd.local)
    netsh advfirewall firewall show rule name="mDNS Responder" >nul
    if %errorLevel% neq 0 (
        echo [Setup] Opening Port 5353 (UDP)...
        netsh advfirewall firewall add rule name="mDNS Responder" dir=in action=allow protocol=UDP localport=5353 profile=any
    ) else (
        echo [Skip] Port 5353 is already configured.
    )

    echo.
    echo [Success] Firewall configured! Opening website...
    
    :: Open the URL in default browser
    start https://kh-rnd.local:3001/
    
    :: Wait a moment so user can see the success message
    timeout /t 3 >nul
    exit
