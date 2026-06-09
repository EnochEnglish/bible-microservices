@echo off
chcp 65001 >nul
echo ========================================
echo   Bible Microservices ????
echo ========================================
echo.
echo ?????? Bible ??...
echo.

:: ???? java ?????? Bible ????
tasklist /FI "IMAGENAME eq java.exe" /FO CSV 2>nul | findstr /i "Bible" >nul
if not errorlevel 1 (
    echo [?? Bible-* ??? Java ??]
    for /f "tokens=2 delims=," %%a in ('tasklist /FI "WINDOWTITLE eq Bible-*" /FO CSV /NH 2^>nul') do taskkill /F /PID %%a 2>nul
)

:: ????
taskkill /F /IM java.exe 2>nul
echo [OK] ?? Java ?????

echo.
echo ========================================
echo   ???????
echo ========================================
echo.
echo ??????...
pause >nul
