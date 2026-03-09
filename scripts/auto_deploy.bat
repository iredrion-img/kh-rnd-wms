@echo off
:: ====================================================
::   KUNHWA WMS - AUTO DEPLOY SCRIPT
::   Triggered by GitHub Webhook
:: ====================================================

:: Set working directory to project root (parent of scripts/)
cd /d "%~dp0.."

:: Log file
set LOG=scripts\deploy.log
echo. >> %LOG%
echo ================================================== >> %LOG%
echo [%date% %time%] Auto-deploy triggered >> %LOG%
echo ================================================== >> %LOG%

:: Wait for webhook response to complete
echo [1/4] Waiting for server response to finish... >> %LOG%
timeout /t 3 /nobreak >nul

:: Pull latest code
echo [2/4] Pulling latest code from GitHub... >> %LOG%
git pull origin main >> %LOG% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] git pull failed! >> %LOG%
    exit /b 1
)

:: Install dependencies if needed
echo [3/4] Installing dependencies... >> %LOG%
call npm install >> %LOG% 2>&1

:: Build frontend
echo [4/4] Building frontend... >> %LOG%
call npm run build >> %LOG% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! >> %LOG%
    exit /b 1
)

:: Restart server: kill existing node server.js, then start fresh
echo [Restart] Stopping old server... >> %LOG%
taskkill /fi "WINDOWTITLE eq Kunhwa WMS Server" /f >nul 2>&1

:: Also kill any node process running server.js directly
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%server.js%%'" get processid /format:list 2^>nul ^| find "="') do (
    taskkill /pid %%i /f >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [Restart] Starting new server... >> %LOG%
start "Kunhwa WMS Server" cmd /k "cd /d "%~dp0.." && node server.js"

echo [Success] Deploy complete at %date% %time% >> %LOG%
echo ================================================== >> %LOG%
