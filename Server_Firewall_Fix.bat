@echo off
:: This script is for the SERVER (Main PC) ONLY.
:: It opens ports 3001 and 5353 in the Windows Firewall.

:checkAdmin
    echo [Check] Requesting Administrator privileges...
    net session >nul 2>&1
    if %errorLevel% == 0 (
        goto :runCommands
    ) else (
        goto :getAdmin
    )

:getAdmin
    echo [Info] Requesting Admin rights to update Firewall...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:runCommands
    echo.
    echo ====================================================
    echo    S E R V E R   F I R E W A L L   S E T U P
    echo ====================================================
    
    echo [1/3] Opening Port 3000 (Frontend TCP)...
    netsh advfirewall firewall add rule name="Kunhwa WMS Frontend" dir=in action=allow protocol=TCP localport=3000 profile=any force=yes

    echo [2/3] Opening Port 3001 (Backend TCP)...
    netsh advfirewall firewall add rule name="Kunhwa WMS Server" dir=in action=allow protocol=TCP localport=3001 profile=any force=yes

    echo [3/3] Opening Port 5353 (UDP) for mDNS...
    netsh advfirewall firewall add rule name="mDNS Responder" dir=in action=allow protocol=UDP localport=5353 profile=any force=yes

    echo.
    echo [Success] Firewall Configured!
    echo You can now access this PC from other devices.
    pause
