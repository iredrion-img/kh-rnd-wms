@echo off
:: ====================================================
::   KUNHWA WMS - START EVERYTHING
:: ====================================================

echo [1/4] Starting Qdrant Vector DB...
:: Start Qdrant in a separate minimized window
if exist "%~dp0qdrant\qdrant.exe" (
    start /min "Qdrant Vector DB" cmd /k "cd /d "%~dp0qdrant" && qdrant.exe"
    timeout /t 3 >nul
    echo       Qdrant started on port 6333
) else (
    echo       [Skip] Qdrant not found, using legacy fallback
)

echo [2/4] Starting Backend Server (port 3001)...
:: Start node server in a separate window
start "Kunhwa WMS Backend" cmd /k "cd /d "%~dp0" && node server.js"

:: Wait 3 seconds for server to initialize
timeout /t 3 >nul

echo [3/4] Starting Frontend (port 3000)...
:: Start Vite frontend in a separate window
start "Kunhwa WMS Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

:: Wait 5 seconds for Vite to compile
timeout /t 5 >nul

echo.
echo [4/4] Connecting to Internet (Ngrok)...
echo.
echo ********************************************************
echo *  IMPORTANT: KEEP ALL WINDOWS OPEN.                   *
echo *  IF YOU CLOSE THEM, THE SITE WILL STOP.              *
echo *  Backend  : http://localhost:3001 (API)               *
echo *  Frontend : http://localhost:3000 (UI)                *
echo ********************************************************
echo.

:: Start ngrok - exposing frontend port 3000
call npx ngrok http --domain=jesenia-indiscrete-laraine.ngrok-free.dev 3000
