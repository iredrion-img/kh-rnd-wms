@echo off
:: ====================================================
::          Ngrok Free Account Setup
:: ====================================================
echo.
echo [STEP 1] Open this site in your browser:
echo https://dashboard.ngrok.com/get-started/your-authtoken
echo.
echo [STEP 2] Log in (Google Login is fastest).
echo.
echo [STEP 3] Copy the "Authtoken" string (starts with 2...)
echo.
set /p token="[STEP 4] Paste the token here and press ENTER: "

echo.
echo Saving token...
call npx ngrok config add-authtoken %token%

echo.
echo [SUCCESS] Setup Complete!
echo You can now close this and run 'Go_Public.bat' again.
pause
