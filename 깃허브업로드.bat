@echo off
cd /d "%~dp0"
echo GitHub push 시작...

:: push만 (커밋은 이미 완료)
git push origin main
if errorlevel 1 git push origin master

echo.
if errorlevel 1 (
  echo push 실패. GitHub 로그인 필요할 수 있습니다.
) else (
  echo push 완료!
)
echo 아무 키나 누르면 창이 닫힙니다.
pause
