@echo off
echo ==========================================
echo       KUNHWA WMS Deployment Launcher
echo ==========================================
echo.
echo [1/3] Detecting IP Address for External Access...
echo ------------------------------------------
ipconfig | findstr "IPv4"
echo ------------------------------------------
echo * Use the IP address above to access from other devices. (e.g., http://192.168.x.x:3001)
echo.

echo [2/3] Starting Production Server...
cd /d %~dp0
start "KUNHWA WMS Server" /min cmd /k "node server.js"

echo [3/3] Opening Application (Local)...
timeout /t 3 >nul
start http://localhost:3001

echo.
echo System started! 
echo Share the IP address above with your team.
echo.
pause
