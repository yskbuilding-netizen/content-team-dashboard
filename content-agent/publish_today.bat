@echo off
cd /d "%~dp0"

echo ====================================
echo  BSN Content Publishing - 2026-05-27
echo ====================================
echo.

echo [1/3] WordPress...
echo --------------------------------
node publish-wp-now.js
echo.

echo [2/3] Threads...
echo --------------------------------
node publish-threads-now.js
echo.

echo [3/3] LinkedIn...
echo --------------------------------
node publish-linkedin-now.js
echo.

echo ====================================
echo  Done
echo ====================================
pause
