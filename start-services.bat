@echo off
set JAVA_HOME=C:\Users\PC\scoop\apps\openjdk17\current
set JAVA=%JAVA_HOME%\bin\java.exe
set DIST=D:\dev\github\bible-microservices\dist

echo Starting Text Service (8081)...
start "TextService" /MIN %JAVA% -jar %DIST%\bible-text-service.jar --server.port=8081

echo Starting Search Service (8082)...
start "SearchService" /MIN %JAVA% -jar %DIST%\bible-search-service.jar --server.port=8082

echo Starting Module Service (8083)...
start "ModuleService" /MIN %JAVA% -jar %DIST%\bible-module-service.jar --server.port=8083

echo All services launched.
echo Waiting 25 seconds before health check...
timeout /t 25 /nobreak >nul

echo === Health Check ===
curl -s http://localhost:8081/api/v1/bible/kjv/GEN/1/1
echo.
curl -s http://localhost:8082/actuator/health
echo.
curl -s http://localhost:8083/actuator/health
echo.
echo Done.
