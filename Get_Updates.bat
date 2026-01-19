@echo off
echo ====================================================
echo      Kunhwa WMS - Download Updates from GitHub
echo ====================================================
echo.
echo NOTE: Please close the Running Server window before continuing.
pause

echo.
echo [1/4] Pulling latest code...
git pull origin main

echo.
echo [2/4] Installing new libraries (if any)...
call npm install

echo.
echo [3/4] Rebuilding Frontend visuals...
call npm run build

echo.
echo [4/4] Done!
echo.
echo ====================================================
echo      [Success] Update Complete!
echo ====================================================
echo.
echo You can now run 'Run_All.bat' again.
pause
