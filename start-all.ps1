# Bible Microservices 一键启动脚本
# 用法: powershell -ExecutionPolicy Bypass -File start-all.ps1
$ErrorActionPreference = "Continue"
$ROOT = "C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices"

# Java
$JAVA_HOME = $env:JAVA_HOME
if (-not $JAVA_HOME) { $JAVA_HOME = "$env:USERPROFILE\scoop\apps\openjdk17\current" }
if (-not (Test-Path "$JAVA_HOME\bin\java.exe")) { $JAVA_HOME = "$ROOT\dist\jdk-17.0.15+6-jre" }
$JAVA_EXE = "$JAVA_HOME\bin\java.exe"

$LOG_DIR = "$ROOT\logs"
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bible Microservices V2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[JAVA] $JAVA_EXE" -ForegroundColor Green
Write-Host "[ROOT] $ROOT" -ForegroundColor Green
Write-Host ""

# --- Clean ports ---
Write-Host "[1/2] Cleaning ports..." -ForegroundColor Yellow
foreach ($p in @(8080, 8081, 8082, 8083, 8086, 3000)) {
    $con = netstat -ano 2>$null | Select-String ":$p "
    if ($con) {
        $con | ForEach-Object {
            $lx = $_ -replace '\s+', ' '
            $pid = $lx.Trim().Split(' ')[-1]
            if ($pid -and $pid -ne '0') {
                taskkill /F /PID $pid 2>$null | Out-Null
                Write-Host "  Killed PID $pid (port $p)" -ForegroundColor DarkGray
            }
        }
    }
}
Start-Sleep -Seconds 2

# --- Start Java services ---
Write-Host ""
Write-Host "[2/2] Starting services..." -ForegroundColor Yellow
Write-Host ""

$svcList = @(
    @{ N="Text";    P=8081; J="bible-text-service\build\libs\bible-text-service.jar";       W="bible-text-service";     S=25 },
    @{ N="Search";  P=8082; J="bible-search-service\build\libs\bible-search-service.jar";     W="bible-search-service";   S=20 },
    @{ N="Module";  P=8083; J="bible-module-service\build\libs\bible-module-service.jar";     W="bible-module-service";   S=15 },
    @{ N="Gateway"; P=8080; J="bible-gateway\build\libs\bible-gateway.jar";                   W="bible-gateway";          S=10 },
    @{ N="Sword";   P=8086; J="bible-sword-service\build\libs\bible-sword-service.jar";       W=".";                      S=10 }
)

$allPids = @()
foreach ($s in $svcList) {
    $jar = Join-Path $ROOT $s.J
    $wd  = Join-Path $ROOT $s.W

    if (-not (Test-Path $jar)) {
        Write-Host "  [SKIP] $($s.N) - JAR missing" -ForegroundColor Red
        continue
    }

    Write-Host "   Starting $($s.N) (:$($s.P))..." -ForegroundColor White
    Write-Host "     JAR: $jar" -ForegroundColor DarkGray
    Write-Host "     WD:  $wd" -ForegroundColor DarkGray

    # Java process with log to separate file
    $logOut = "$LOG_DIR\$($s.N.ToLower())_out.log"
    $logErr = "$LOG_DIR\$($s.N.ToLower())_err.log"
    "" > $logOut; "" > $logErr

    $p = Start-Process -FilePath $JAVA_EXE `
        -ArgumentList @("-Xms128m", "-Xmx512m", "-jar", $jar) `
        -WorkingDirectory $wd `
        -WindowStyle Hidden `
        -PassThru

    $allPids += "$($s.N):$($s.P):$($p.Id)"

    Write-Host "     PID: $($p.Id), waiting $($s.S)s..." -ForegroundColor DarkGray
    Start-Sleep -Seconds $s.S

    # Quick health check (use /actuator/health if just started, it may not have root endpoint)
    $up = $false
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($s.P)/actuator/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $up = $true }
    } catch { }
    if (-not $up) {
        # Some services don't have actuator - check port just being open
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$($s.P)" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            $up = $true
        } catch { }
    }
    if ($up) {
        Write-Host "   [OK] $($s.N) http://localhost:$($s.P)" -ForegroundColor Green
    } else {
        Write-Host "   [--] $($s.N) may still be starting..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# --- Frontend ---
$fd = Join-Path $ROOT "frontend"
Write-Host "   Starting Frontend (:3000)..." -ForegroundColor White
Write-Host "     WD:  $fd" -ForegroundColor DarkGray

$fp = Start-Process -FilePath "python" `
    -ArgumentList @("-m", "http.server", "3000") `
    -WorkingDirectory $fd `
    -WindowStyle Hidden `
    -PassThru

$allPids += "Frontend:3000:$($fp.Id)"
Start-Sleep -Seconds 3

try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "   [OK] Frontend http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "   [--] Frontend may still be starting..." -ForegroundColor Yellow
}

# --- Status ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ok = 0
$all = @(@{N="Text";P=8081},@{N="Search";P=8082},@{N="Module";P=8083},@{N="Gateway";P=8080},@{N="Sword";P=8086},@{N="Frontend";P=3000})
foreach ($s in $all) {
    # Try actuator first, then root, then port scan
    $up = $false
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($s.P)/actuator/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $up = $true }
    } catch { }
    if (-not $up) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$($s.P)" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 404) { $up = $true }
        } catch { }
    }
    if (-not $up) {
        $portCheck = netstat -ano 2>$null | Select-String ":$($s.P) "
        if ($portCheck) { $up = $true }
    }
    if ($up) {
        Write-Host "  [OK] $($s.N)  http://localhost:$($s.P)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  [--] $($s.N)  :$($s.P)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  $ok / $($all.Count) services running" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Gateway  : http://localhost:8080" -ForegroundColor White
Write-Host "  Sword    : http://localhost:8086" -ForegroundColor White
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
Write-Host ""

# Save PIDs
$pf = "$LOG_DIR\service-pids.txt"
$allPids -join "`n" > $pf
Write-Host "  PIDs: $pf" -ForegroundColor DarkGray
Write-Host "  Stop: .\stop-all.ps1" -ForegroundColor DarkGray
Write-Host ""
