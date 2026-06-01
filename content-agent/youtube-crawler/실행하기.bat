@echo off
cd /d "%~dp0"
chcp 65001 > nul
echo.
echo === BSN TV Transcript Crawler ===
echo.

where py > nul 2>&1
if %errorlevel%==0 (
    py crawl_bsn_tv.py %*
    goto :end
)

where python > nul 2>&1
if %errorlevel%==0 (
    python crawl_bsn_tv.py %*
    goto :end
)

echo [ERROR] Python not found.
echo Install from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during install.

:end
echo.
pause
