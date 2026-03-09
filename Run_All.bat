@echo off
:: ====================================================
::   KUNHWA WMS - START EVERYTHING
:: ====================================================

echo [1/3] Starting Qdrant Vector DB...
:: Start Qdrant in a separate minimized window
if exist "%~dp0qdrant\qdrant.exe" (
    start /min "Qdrant Vector DB" cmd /k "cd /d "%~dp0qdrant" && qdrant.exe"
    timeout /t 3 >nul
    echo       Qdrant started on port 6333
) else (
    echo       [Skip] Qdrant not found, using legacy fallback
)

echo [2/3] Starting Local Server...
:: Start node server in a separate window
start "Kunhwa WMS Server" cmd /k "cd /d "%~dp0" && node server.js"

:: Wait 3 seconds for server to initialize
timeout /t 3 >nul

echo.
echo [3/3] Connecting to Internet (Ngrok)...
echo.
echo ********************************************************
echo *  IMPORTANT: KEEP THIS WINDOW AND THE SERVER WINDOW   *
echo *  OPEN. IF YOU CLOSE THEM, THE SITE WILL STOP.        *
echo ********************************************************
echo.

:: Start ngrok with PERMANENT domain
call npx ngrok http --domain=jesenia-indiscrete-laraine.ngrok-free.dev 3001
