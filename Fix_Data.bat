@echo off
cd /d "%~dp0"
title Kunhwa WMS - Data Repair

echo ====================================================
echo      Kunhwa WMS - Data Repair Tool
echo ====================================================
echo.
echo Current Directory: %CD%

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT found in PATH.
    echo Please make sure Node.js is installed.
    pause
    exit /b
)

:: Check for Script
if not exist "scripts\fix_users.js" (
    echo [ERROR] 'scripts\fix_users.js' NOT found.
    echo Please run 'Get_Updates.bat' again or check file structure.
    pause
    exit /b
)

echo Starting Repair Script...
echo ----------------------------------------------------
:: Run Script
node scripts/fix_users.js
if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------
    echo [FAILURE] The script exited with errors.
) else (
    echo.
    echo ----------------------------------------------------
    echo [SUCCESS] Script finished normally.
)

echo.
echo Press ANY KEY to close this window...
pause >nul
