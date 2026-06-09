@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   Bible Microservices ??? v1.0
echo ========================================
echo.

set "APP_HOME=%~dp0"

:: ??????? JRE
set "JRE_DIR=%APP_HOME%jdk-17\.0\.15\+6-jre\bin"
if exist "%JRE_DIR%\java.exe" (
    set "JAVA_HOME=%APP_HOME%jre"
    set "PATH=%JRE_DIR%;%PATH%"
    echo [+] ????? Java 8 ????
) else (
    echo [!] ?????? JRE????? Java
)

:: ?? Java
java -version 2>&1 | findstr /i "version" >nul
if errorlevel 1 (
    echo.
    echo [??] ??? Java ????!
    echo ???????????? start.bat
    pause
    exit /b 1
)

:: ??????
if not exist "%APP_HOME%data" mkdir "%APP_HOME%data"
if not exist "%APP_HOME%data\text-db" mkdir "%APP_HOME%data\text-db"
if not exist "%APP_HOME%data\search-index" mkdir "%APP_HOME%data\search-index"
if not exist "%APP_HOME%logs" mkdir "%APP_HOME%logs"

:: ??????
call "%APP_HOME%stop.bat" >nul 2>&1
echo.

:: ?????
echo [1/4] Module Service ^(?? 8083^)...
start "Bible-Module" cmd /c "cd /d "%APP_HOME%services\module-service" && "%JAVA_HOME%\bin\java.exe" -Xms128m -Xmx256m -jar bible-module-service.jar --spring.config.location=application.yml > "%APP_HOME%logs\module-service.log" 2>&1"
timeout /t 2 /nobreak >nul

echo [2/4] Text Service ^(?? 8081^)...
start "Bible-Text" cmd /c "cd /d "%APP_HOME%services\text-service" && "%JAVA_HOME%\bin\java.exe" -Xms128m -Xmx256m -jar bible-text-service.jar --spring.config.location=application.yml > "%APP_HOME%logs\text-service.log" 2>&1"
timeout /t 2 /nobreak >nul

echo [3/4] Search Service ^(?? 8082^)...
start "Bible-Search" cmd /c "cd /d "%APP_HOME%services\search-service" && "%JAVA_HOME%\bin\java.exe" -Xms128m -Xmx256m -jar bible-search-service.jar --spring.config.location=application.yml > "%APP_HOME%logs\search-service.log" 2>&1"
timeout /t 2 /nobreak >nul

echo [4/4] Gateway ^(?? 8080^)...
start "Bible-Gateway" cmd /c "cd /d "%APP_HOME%services\gateway" && "%JAVA_HOME%\bin\java.exe" -Xms128m -Xmx256m -jar bible-gateway.jar --spring.config.location=application.yml > "%APP_HOME%logs\gateway.log" 2>&1"

echo.
echo ??????...
timeout /t 6 /nobreak >nul

:: ??????
echo.
echo ??????...
powershell -Command "
$ok = 0
$fail = 0
$ports = @(8080,8081,8082,8083)
$names = @('Gateway','Text','Search','Module')
for($i=0;$i -lt 4;$i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$i])/actuator/health" -TimeoutSec 3 -UseBasicParsing
        if($r.StatusCode -eq 200) { Write-Host ""  [OK] $($names[$i]) Service " -ForegroundColor Green; $ok++ }
    } catch {
        Write-Host ""  [--] $($names[$i]) Service " -ForegroundColor Yellow
        $fail++
    }
}
Write-Host ""
Write-Host "  $ok/4 ?????" -ForegroundColor Cyan
"

echo.
echo ========================================
echo   Bible Microservices ???!
echo ========================================
echo.
echo ????:
echo   Gateway (API??):  http://localhost:8080
echo   Text Service:       http://localhost:8081
echo   Search Service:     http://localhost:8082
echo   Module Service:     http://localhost:8083
echo.
echo ????: %APP_HOME%logs
echo ????: ?? stop.bat
echo.
echo ?????? Swagger UI...
pause >nul
start http://localhost:8080/swagger-ui.html
echo.
echo ????????^! ???????????
pause
