@echo off
REM ============================================================
REM Bible Microservices - 本地启动脚本（Windows）
REM 使用系统 Java 17，不需要 Docker
REM
REM 依赖：H2 数据库（文件存储，无需安装）
REM ============================================================

setlocal enabledelayedexpansion

REM 设置 Java 17 路径
set JAVA_HOME=C:\Users\PC\scoop\apps\openjdk17\current
set PATH=%JAVA_HOME%\bin;%PATH%

REM 设置项目根目录
set PROJECT_DIR=%~dp0

REM 创建数据目录
if not exist "%PROJECT_DIR%bible-text-service\data" mkdir "%PROJECT_DIR%bible-text-service\data"
if not exist "%PROJECT_DIR%bible-module-service\data" mkdir "%PROJECT_DIR%bible-module-service\data"
if not exist "%PROJECT_DIR%bible-search-service\data" mkdir "%PROJECT_DIR%bible-search-service\data"

echo ================================================
echo   Bible Microservices 启动脚本
echo   Java: %JAVA_HOME%
echo ================================================

REM 检查 JAR 是否存在
set JAR_TEXT=bible-text-service\build\libs\bible-text-service.jar
set JAR_MODULE=bible-module-service\build\libs\bible-module-service.jar
set JAR_SEARCH=bible-search-service\build\libs\bible-search-service.jar
set JAR_GATEWAY=bible-gateway\build\libs\bible-gateway.jar

if not exist "%PROJECT_DIR%%JAR_TEXT%" (
    echo [ERROR] %JAR_TEXT% not found. Please run: gradlew build
    exit /b 1
)

REM 启动各服务（使用 start 命令在新窗口启动）
echo Starting bible-text-service on port 8081 ...
start "Bible-Text-Service" cmd /c "cd /d %PROJECT_DIR%bible-text-service && java -jar build\libs\bible-text-service.jar"

timeout /t 3 /nobreak >nul

echo Starting bible-module-service on port 8083 ...
start "Bible-Module-Service" cmd /c "cd /d %PROJECT_DIR%bible-module-service && java -jar build\libs\bible-module-service.jar"

timeout /t 3 /nobreak >nul

echo Starting bible-search-service on port 8082 ...
start "Bible-Search-Service" cmd /c "cd /d %PROJECT_DIR%bible-search-service && java -jar build\libs\bible-search-service.jar"

timeout /t 3 /nobreak >nul

echo Starting bible-gateway on port 8080 ...
start "Bible-Gateway" cmd /c "cd /d %PROJECT_DIR%bible-gateway && java -jar build\libs\bible-gateway.jar"

echo.
echo ================================================
echo   所有服务已启动！
echo   API Gateway:  http://localhost:8080
echo   Text Service: http://localhost:8081
echo   Search:       http://localhost:8082
echo   Module:       http://localhost:8083
echo   H2 Console:   http://localhost:8081/h2-console
echo ================================================
echo.
echo 按任意键退出此窗口（服务继续在后台运行）...
pause >nul