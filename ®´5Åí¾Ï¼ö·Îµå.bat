@echo off
cd /d "%~dp0"
git push origin main
if errorlevel 1 git push origin master
echo.
if errorlevel 1 (
  echo PUSH FAILED - check GitHub login
) else (
  echo PUSH OK!
)
pause
