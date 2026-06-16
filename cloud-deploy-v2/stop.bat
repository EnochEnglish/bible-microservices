@echo off
REM Bible Microservices — Windows 停止脚本
echo ==========================================
echo   Stopping Bible Microservices...
echo ==========================================

taskkill /f /fi "WINDOWTITLE eq Bible-*" 2>nul
taskkill /f /im java.exe /fi "MEMUSAGE gt 100000" 2>nul

echo Done.
pause
