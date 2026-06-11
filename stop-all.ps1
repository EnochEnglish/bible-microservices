# Bible Microservices 停止所有服务
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  停止 Bible Microservices" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 方法1: 从 PID 文件停止
$pidFile = "$PSScriptRoot\logs\service-pids.txt"
if (Test-Path $pidFile) {
    Write-Host "[1] 从 PID 文件停止..." -ForegroundColor Yellow
    Get-Content $pidFile | ForEach-Object {
        $parts = $_ -split ':'
        $name = $parts[0]
        $pid = $parts[-1]
        if ($pid) {
            Write-Host "  停止 $name (PID $pid)..." -ForegroundColor DarkGray
            taskkill /F /PID $pid 2>$null | Out-Null
        }
    }
    Start-Sleep -Seconds 2
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# 方法2: 按端口杀进程
Write-Host "[2] 按端口清理..." -ForegroundColor Yellow
$ports = @(8080, 8081, 8082, 8083, 8086, 3000)
foreach ($p in $ports) {
    $netstat = netstat -ano 2>$null | Select-String ":$p "
    if ($netstat) {
        $netstat | ForEach-Object {
            $line = $_ -replace '\s+', ' '
            $pid = $line.Trim().Split(' ')[-1]
            if ($pid -and $pid -ne '0') {
                taskkill /F /PID $pid 2>$null | Out-Null
            }
        }
    }
}

Start-Sleep -Seconds 2

# 验证
Write-Host ""
Write-Host "[验证] 检查端口..." -ForegroundColor Yellow
$allClear = $true
foreach ($p in $ports) {
    $still = netstat -ano 2>$null | Select-String ":$p "
    if ($still) {
        Write-Host "  [!] 端口 $p 仍被占用" -ForegroundColor Red
        $allClear = $false
    } else {
        Write-Host "  [OK] 端口 $p 已释放" -ForegroundColor Green
    }
}

Write-Host ""
if ($allClear) {
    Write-Host "  所有服务已停止" -ForegroundColor Green
} else {
    Write-Host "  部分端口仍被占用，可能需要手动清理" -ForegroundColor Yellow
}
Write-Host ""
