@echo off
echo ====================================================
echo      Kunhwa WMS - Upload Updates to GitHub
echo ====================================================
echo.

:: Get Date and Time for Commit Message
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

echo [1/3] Adding files...
git add .

echo [2/3] Committing changes...
git commit -m "Update: %mydate% %mytime%"

echo [3/3] Pushing to Server (GitHub)...
git push origin main

echo.
echo ====================================================
echo      [Success] Upload Complete!
echo ====================================================
echo.
echo Now go to the SERVER PC and run 'Get_Updates.bat'.
echo.
pause
