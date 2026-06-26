@echo off
echo ====================================================
echo    KUNHWA WMS - STOPPING BACKGROUND SERVERS
echo ====================================================

echo [Info] Stopping all PM2 processes...
call pm2 stop all

echo [Info] Removing processes from PM2 list...
call pm2 delete all

echo.
echo ====================================================
echo [Success] All servers have been safely shut down!
echo ====================================================
pause
