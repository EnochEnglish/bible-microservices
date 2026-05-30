$j = "C:\Users\PC\scoop\apps\openjdk17\current\bin\java.exe"
$base = "C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices"

$svcs = @(
    @{n="text"; jar="$base\bible-text-service\build\libs\bible-text-service.jar"; dir="$base\bible-text-service"},
    @{n="module"; jar="$base\bible-module-service\build\libs\bible-module-service.jar"; dir="$base\bible-module-service"},
    @{n="search"; jar="$base\bible-search-service\build\libs\bible-search-service.jar"; dir="$base\bible-search-service"},
    @{n="gateway"; jar="$base\bible-gateway\build\libs\bible-gateway.jar"; dir="$base\bible-gateway"}
)

foreach ($svc in $svcs) {
    $p = Start-Process $j -ArgumentList "-jar",$svc.jar -WorkingDirectory $svc.dir -PassThru
    "[$($svc.n)] PID=$($p.Id) - $(Get-Date -Format 'HH:mm:ss')"
}

Write-Host "All started. Sleeping 30s to let services start..."
Start-Sleep -Seconds 30

$OutputEncoding = [System.Text.Encoding]::UTF8
$ports = @(8081, 8083, 8082, 8080)
$names = @("text", "module", "search", "gateway")
$urls = @("/api/v1/bible/translations", "/api/v1/modules/available", "/api/v1/search?query=love", "/actuator/health")

for ($i = 0; $i -lt 4; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$i])$($urls[$i])" -TimeoutSec 8 -UseBasicParsing
        $body = $r.Content.Substring(0, [Math]::Min(60, $r.Content.Length))
        "[$($names[$i])] $($r.StatusCode) OK - $body"
    } catch {
        $err = $_.Exception.Message.Split(':')[-1].Trim()
        "[$($names[$i])] FAIL: $err"
    }
}

"[DONE] $(Get-Date -Format 'HH:mm:ss')"