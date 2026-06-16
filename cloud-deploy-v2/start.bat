@echo off
REM ============================================================
REM Bible Microservices — Windows 启动脚本
REM 需要 Java 17+ 和 Node.js 18+
REM ============================================================
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set LOG_DIR=%SCRIPT_DIR%logs
set DATA_DIR=%SCRIPT_DIR%data
set SERVICES_DIR=%SCRIPT_DIR%services
set FRONTEND_DIR=%SCRIPT_DIR%frontend

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ==========================================
echo   Bible Microservices v2.0 (Windows)
echo   Starting all 7 services...
echo ==========================================

set JAVA_OPTS=-Xms256m -Xmx512m

echo [1/7] Starting Text Service (8081)...
start "Bible-Text" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-text-service.jar" --server.port=8081 --spring.datasource.url="jdbc:h2:file:%DATA_DIR%\text-db" > "%LOG_DIR%\text-service.log" 2>&1

echo [2/7] Starting Search Service (8082)...
start "Bible-Search" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-search-service.jar" --server.port=8082 > "%LOG_DIR%\search-service.log" 2>&1

echo [3/7] Starting Module Service (8083)...
start "Bible-Module" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-module-service.jar" --server.port=8083 > "%LOG_DIR%\module-service.log" 2>&1

echo [4/7] Starting Auth Service (8084)...
start "Bible-Auth" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-auth-service.jar" --server.port=8084 --spring.datasource.url="jdbc:h2:file:%DATA_DIR%\auth-db" > "%LOG_DIR%\auth-service.log" 2>&1

echo [5/7] Starting Sword Service (8086)...
start "Bible-Sword" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-sword-service.jar" --server.port=8086 --sword.modules-path="%DATA_DIR%\sword-mods" > "%LOG_DIR%\sword-service.log" 2>&1

timeout /t 5 /nobreak >nul

echo [6/7] Starting Gateway (8080)...
start "Bible-Gateway" java %JAVA_OPTS% -jar "%SERVICES_DIR%\bible-gateway.jar" --server.port=8080 > "%LOG_DIR%\gateway.log" 2>&1

echo [7/7] Starting Frontend (3000)...
start "Bible-Frontend" node "%FRONTEND_DIR%\server.js" > "%LOG_DIR%\frontend.log" 2>&1

echo ==========================================
echo   All 7 services launched!
echo   Wait ~20s for Spring Boot to initialize.
echo.
echo   Open: http://localhost:3000
echo.
echo   Logs: %LOG_DIR%
echo   Stop: Close the console windows or use Task Manager
echo ==========================================
pause
