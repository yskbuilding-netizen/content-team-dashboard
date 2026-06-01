@echo off
cd /d "%~dp0server"
echo.
echo ========================================
echo  빌사남 콘텐츠 현황판 서버 시작 중...
echo ========================================
echo.
echo  브라우저에서 접속: http://localhost:3000
echo.
node server.js
pause
