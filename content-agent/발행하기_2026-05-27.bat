@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ====================================
echo  2026-05-27 콘텐츠 발행
echo  주제: 사옥용 빌딩 대출 LTV 90%
echo ====================================
echo.

echo [1/3] 워드프레스 발행 시작...
echo --------------------------------
call node publish-wp-now.js
echo.

echo [2/3] 스레드 발행 시작...
echo --------------------------------
call node publish-threads-now.js
echo.

echo [3/3] 링크드인 발행 시작...
echo --------------------------------
call node publish-linkedin-now.js
echo.

echo ====================================
echo  발행 완료
echo ====================================
pause
