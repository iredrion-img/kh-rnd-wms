@echo off
echo ====================================================
echo      Kunhwa WMS - Data Repair Tool
echo ====================================================
echo.
echo This script will fix duplicate users in users.csv.
echo A backup will be created as users_backup.csv.
echo.

:: Run the Node.js script
node scripts/fix_users.js

echo.
echo ====================================================
echo      Repair Finished.
echo ====================================================
echo.
pause
