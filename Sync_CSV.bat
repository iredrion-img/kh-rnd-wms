@echo off
chcp 65001 > nul
echo.
echo ==============================
echo   JSON ^> CSV 동기화 시작
echo ==============================
echo.

cd /d "%~dp0"

node scripts/sync_json_to_csv.cjs 2026

echo.
echo 완료! 아무 키나 누르면 창이 닫힙니다.
pause > nul
