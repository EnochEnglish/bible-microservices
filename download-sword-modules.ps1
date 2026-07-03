# Direct download SWORD modules from CrossWire
# CrossWire naming convention: First letter capitalized (e.g. Imitation.zip)
# Download to data/sword-mods/{module}/ and extract

param(
    [string]$modulesPath = "D:\dev\github\bible-microservices\data\sword-mods",
    [int]$timeoutSec = 120
)

$baseUrl = "https://crosswire.org/ftpmirror/pub/sword/packages/rawzip"

# Fetch available modules from local API
Write-Host "Fetching available modules..." -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sword/install/available?source=crosswire" -UseBasicParsing -TimeoutSec 30
$json = $r.Content | ConvertFrom-Json
$mods = $json.modules
$notInstalled = $mods | Where-Object { $_.installed -ne $true }

# Filter to valuable non-BIBLE modules, exclude small languages
$toInstall = $notInstalled | Where-Object {
    $_.category -in @("GENERAL_BOOK", "COMMENTARY", "DICTIONARY", "DAILY_DEVOTION")
}

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
            $prefix = $pattern -replace "\*", ""
            if ($name.StartsWith($prefix)) { $exclude = $true; break }
        } else {
            if ($name -eq $pattern) { $exclude = $true; break }
        }
    }
    -not $exclude
} | Sort-Object category, name

Write-Host "`n=== Modules to Download: $($filtered.Count) ===" -ForegroundColor Green
$filtered | Group-Object category | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Yellow
}

# Download and extract
$success = 0
$failed = @()

foreach ($mod in $filtered) {
    $name = $mod.name
    # CrossWire naming: first letter capitalized
    $capName = $name.Substring(0,1).ToUpper() + $name.Substring(1)
    $zipUrl = "$baseUrl/$capName.zip"
    $zipFile = Join-Path $modulesPath "_tmp_$name.zip"
    $targetDir = Join-Path $modulesPath $name
    
    Write-Host "`n[$($success + $failed.Count + 1)/$($filtered.Count)] $name " -NoNewline -ForegroundColor Cyan
    
    # Skip if already extracted
    if ((Test-Path "$targetDir\mods.d") -and (Test-Path "$targetDir\modules")) {
        Write-Host "[ALREADY EXISTS]" -ForegroundColor DarkGray
        $success++
        continue
    }
    
    try {
        # Download
        Write-Host "downloading... " -NoNewline -ForegroundColor DarkGray
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing -TimeoutSec $timeoutSec
        
        # Extract
        Write-Host "extracting... " -NoNewline -ForegroundColor DarkGray
        if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $targetDir)
        
        # Handle nested directory (common in CrossWire zips)
        $children = Get-ChildItem $targetDir
        if ($children.Count -eq 1 -and $children[0].PSIsContainer) {
            $inner = $children[0].FullName
            if ((Test-Path "$inner\mods.d") -and (Test-Path "$inner\modules")) {
                Get-ChildItem $inner | ForEach-Object { Move-Item $_.FullName $targetDir -Force }
                Remove-Item $inner -Force
            }
        }
        
        # Verify
        if ((Test-Path "$targetDir\mods.d") -and (Test-Path "$targetDir\modules")) {
            Remove-Item $zipFile -Force
            Write-Host "OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host "INVALID (missing mods.d or modules)" -ForegroundColor Red
            $failed += "$name : Invalid zip structure"
        }
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed += "$name : $($_.Exception.Message)"
        if (Test-Path $zipFile) { Remove-Item $zipFile -Force -ErrorAction SilentlyContinue }
    }
}

Write-Host "`n=== Download Complete ===" -ForegroundColor Green
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed: $($failed.Count)" -ForegroundColor Red
if ($failed.Count -gt 0) {
    Write-Host "`nFailed modules:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

Write-Host "`nRestart monolith to load new modules." -ForegroundColor Yellow
