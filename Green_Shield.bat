@echo off
:: ====================================================
::   GREEN SHIELD (TRUST CERTIFICATE INSTALLER)
:: ====================================================
:: This script installs the 'cert.pem' file into the Trusted Root Store.
:: This will REMOVE the "Not Secure" warning in Chrome/Edge.

:checkAdmin
    echo [1/3] Checking Administrator privileges...
    net session >nul 2>&1
    if %errorLevel% == 0 (
        goto :runCommands
    ) else (
        goto :getAdmin
    )

:getAdmin
    echo [Info] I need Administrator rights to install the security certificate.
    echo [Info] Please click 'Yes' in the popup window!
    
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:runCommands
    :: Fix: Set working directory to project root explicitly
    cd /d c:\KH_RnD

    echo.
    echo [2/3] Installing Certificate to Trusted Root...
    :: Install cert.pem to "Root" store (Trusted Root Certification Authorities)
    certutil -addstore -f "Root" "cert.pem"
    
    echo.
    if %errorLevel% == 0 (
        echo [SUCCESS] Certificate installed! The warning should disappear.
        echo (You may need to restart your browser)
    ) else (
        echo [ERROR] Failed to install certificate.
    )

    echo.
    echo [3/3] Restarting Server to apply new certificate...
    taskkill /f /im node.exe >nul 2>&1
    start Run_WMS.bat

    echo.
    pause
