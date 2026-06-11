@echo off
set JAVA="C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\dist\jdk-17.0.15+6-jre\bin\java.exe"
set H2JAR="C:\Users\PC\AppData\Local\Temp\h2-2.2.224.jar"
set SQL="C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\import_bible.sql"

%JAVA% -Xmx4g -cp %H2JAR% org.h2.tools.RunScript -url jdbc:h2:file:./data/text-db;MODE=MySQL -user sa -script %SQL%
echo Exit code: %ERRORLEVEL%