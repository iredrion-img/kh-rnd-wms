@echo off
echo Starting Public Access Tunnel...
echo.
echo [IMPORTANT]
echo 1. You might be asked to log in or sign up for ngrok (it's free).
echo 2. Once running, copy the "Forwarding" URL (e.g., https://xxxx.ngrok-free.app).
echo 3. Send that URL to your mobile device to connect.
echo.
pause
call npx ngrok http 3001
pause
