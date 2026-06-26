@echo off
echo ====================================================
echo    KUNHWA WMS - GET CLOUDFLARE EXTERNAL URL
echo ====================================================
echo.
echo [Info] Fetching your secure external access link...
echo (If it's blank, wait a few seconds and run again)
echo.

:: Get the last 30 lines of the tunnel log and filter for the URL
call pm2 logs cloudflare-tunnel --lines 150 --nostream | findstr "trycloudflare.com"

echo.
echo ====================================================
echo Copy the link above starting with "https://"
echo This is your external access link for WMS.
echo ====================================================
pause
