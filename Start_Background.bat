@echo off
echo ====================================================
echo    KUNHWA WMS - BACKGROUND SERVER START (PM2)
echo ====================================================

:: Check if PM2 is installed
call pm2 -v >nul 2>&1
if %errorLevel% neq 0 (
    echo [Info] PM2 is not installed. Installing PM2 globally...
    call npm install -g pm2
)

:: Check if cloudflared is downloaded
if not exist "cloudflared.exe" (
    echo [Info] cloudflared.exe not found. Downloading it now...
    call powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo [Info] Starting servers in the background...
call pm2 start ecosystem.config.cjs

echo.
echo ====================================================
echo [Success] All servers are now running in the background!
echo You can safely close this terminal window.
echo.
echo [Useful PM2 Commands]
echo - Check status : pm2 status
echo - View logs    : pm2 logs
echo - Stop all     : pm2 stop all
echo - Restart all  : pm2 restart all
echo ====================================================
pause
