@echo off
setlocal

echo ====================================================
echo        Kunhwa WMS - Setup Script
echo ====================================================

echo.
echo [1/3] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed!
    echo Please install Node.js LTS version from https://nodejs.org/
    echo Opening download page...
    start https://nodejs.org/
    pause
    exit /b
)
echo [OK] Node.js is installed.

echo.
echo [2/3] Installing dependencies (This may take a minute)...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [Error] Failed to install dependencies.
    pause
    exit /b
)

echo.
echo [3/3] Creating Desktop Shortcut...
set "TARGET=%~dp0Run_All.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Kunhwa WMS.lnk"
set "ICON=%~dp0public\favicon.ico"
set "WORKING_DIR=%~dp0"

powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%');$s.TargetPath='%TARGET%';$s.WorkingDirectory='%WORKING_DIR%';$s.IconLocation='%ICON%';$s.Save()"

echo.
echo ====================================================
echo    [Success] Setup complete!
echo    A shortcut "Kunhwa WMS" has been created on your Desktop.
echo ====================================================
echo.
pause
