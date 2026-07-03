# Batch install all valuable SWORD modules from CrossWire repository
# Categories: GENERAL_BOOK, COMMENTARY, DICTIONARY, DAILY_DEVOTION
# Excludes: BIBLE (already have 16), CULT (non-orthodox), small language variants

$baseUrl = "http://localhost:8080/api/v1/sword/install"
$repoId = "crosswire"

# Fetch available modules
Write-Host "Fetching available modules from CrossWire..." -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "$baseUrl/available?source=$repoId" -UseBasicParsing -TimeoutSec 30
$mods = ($r.Content | ConvertFrom-Json).modules
$notInstalled = $mods | Where-Object { $_.installed -ne $true }

# Define what to install (exclude BIBLE since we have 16 already, exclude CULT)
$toInstall = $notInstalled | Where-Object {
    $_.category -in @("GENERAL_BOOK", "COMMENTARY", "DICTIONARY", "DAILY_DEVOTION")
}

# Filter out non-English/non-Chinese small-language modules we don't need
$excludePatterns = @(
    "fre*", "ger*", "dut*", "por*", "rus*", "slo*", "ita*", "swe*", 
    "vie*", "bre", "klv*", "la_en", "gezenoch", "fredidache", 
    "freflavius", "frepilgrim", "frelitcal*", "porlitcal*"
)

$filtered = $toInstall | Where-Object {
    $name = $_.name.ToLower()
    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($pattern -like "*`*") {
            # Wildcard pattern
            $prefix = $pattern -replace "\*", ""
            if ($name.StartsWith($prefix)) { $exclude = $true; break }
        } else {
            if ($name -eq $pattern) { $exclude = $true; break }
        }
    }
    -not $exclude
}

Write-Host "`nModules to install: $($filtered.Count)" -ForegroundColor Green
$filtered | Group-Object category | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Yellow
}

Write-Host "`n--- Module List ---" -ForegroundColor Cyan
$filtered | Sort-Object category, name | ForEach-Object {
    Write-Host "  [$($_.category)] $($_.name) - $($_.description)"
}

# Install each module
Write-Host "`n=== Starting Installation ===" -ForegroundColor Green
$success = 0
$failed = 0
$failedModules = @()

foreach ($mod in $filtered) {
    $name = $mod.name
    Write-Host "`n[$($success + $failed + 1)/$($filtered.Count)] Installing $name..." -ForegroundColor Cyan -NoNewline
    
    try {
        $body = @{ source = $repoId; module = $name } | ConvertTo-Json
        $installResp = Invoke-WebRequest -Uri "$baseUrl" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 120
        $result = $installResp.Content | ConvertFrom-Json
        
        if ($result.success) {
            Write-Host " OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host " FAILED: $($result.message)" -ForegroundColor Red
            $failed++
            $failedModules += "$name : $($result.message)"
        }
    } catch {
        Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $failedModules += "$name : $($_.Exception.Message)"
    }
    
    # Small delay between installs
    Start-Sleep -Milliseconds 500
}

Write-Host "`n=== Installation Complete ===" -ForegroundColor Green
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
if ($failedModules.Count -gt 0) {
    Write-Host "`nFailed modules:" -ForegroundColor Red
    $failedModules | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

# Verify final count
Write-Host "`n=== Verifying Installation ===" -ForegroundColor Cyan
$verifyResp = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sword/modules" -UseBasicParsing -TimeoutSec 10
$verifyMods = $verifyResp.Content | ConvertFrom-Json
Write-Host "Total SWORD modules now installed: $($verifyMods.Count)" -ForegroundColor Green
$verifyMods | Group-Object { $_.category } | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count)"
}
