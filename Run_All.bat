@echo off
:: ====================================================
::   KUNHWA WMS - START EVERYTHING
:: ====================================================

echo [1/2] Starting Local Server...
:: Start node server in a separate window
start "Kunhwa WMS Server" cmd /k "node server.js"

:: Wait 3 seconds for server to initialize
timeout /t 3 >nul

echo.
echo [2/2] Connecting to Internet (Ngrok)...
echo.
echo ********************************************************
echo *  IMPORTANT: KEEP THIS WINDOW AND THE SERVER WINDOW   *
echo *  OPEN. IF YOU CLOSE THEM, THE SITE WILL STOP.        *
echo ********************************************************
echo.

:: Start ngrok with PERMANENT domain
call npx ngrok http --domain=jesenia-indiscrete-laraine.ngrok-free.dev 3001
