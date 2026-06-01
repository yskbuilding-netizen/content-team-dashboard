@echo off
REM 빌사남 텔레그램 개발 봇 시작 스크립트
REM 종료되면 자동 재시작 (작업스케줄러 없이도 충돌 복구)

cd /d "%~dp0"

echo [%date% %time%] bot starting...

:loop
node bot.js
echo [%date% %time%] bot exited, restarting in 5s...
timeout /t 5 /nobreak >nul
goto loop
