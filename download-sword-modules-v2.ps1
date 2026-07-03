# Download SWORD modules from CrossWire using exact filenames from directory listing
# Strategy: fetch the actual directory listing, match module names to exact .zip filenames

param(
    [string]$modulesPath = "D:\dev\github\bible-microservices\data\sword-mods",
    [string]$repoUrl = "https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/"
)

# Step 1: Fetch available modules from local API
Write-Host "Fetching available modules from API..." -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sword/install/available?source=crosswire" -UseBasicParsing -TimeoutSec 30
$json = $r.Content | ConvertFrom-Json
$mods = $json.modules
$notInstalled = $mods | Where-Object { $_.installed -ne $true }

# Filter to valuable non-BIBLE modules
$toInstall = $notInstalled | Where-Object {
    $_.category -in @("GENERAL_BOOK", "COMMENTARY", "DICTIONARY", "DAILY_DEVOTION")
}

# Exclude small languages we don't need
$excludePrefixes = @("fre","ger","dut","por","rus","slo","ita","swe","vie","bre","klv")
$filtered = $toInstall | Where-Object {
    $name = $_.name.ToLower()
    $exclude = $false
    foreach ($prefix in $excludePrefixes) {
        if ($name.StartsWith($prefix)) { $exclude = $true; break }
    }
    # Also exclude specific non-English modules
    if ($name -in @("la_en","gezenoch","fredidache","freflavius","frepilgrim","br_en","en_eu")) { $exclude = $true }
    -not $exclude
} | Sort-Object category, name

Write-Host "`n=== Modules to Download: $($filtered.Count) ===" -ForegroundColor Green
$filtered | Group-Object category | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Yellow
}

# Step 2: Fetch actual zip filenames from CrossWire directory listing
Write-Host "`nFetching zip file listing from CrossWire..." -ForegroundColor Cyan
$listResp = Invoke-WebRequest -Uri $repoUrl -UseBasicParsing -TimeoutSec 15
$allZips = [regex]::Matches($listResp.Content, 'href="([^"]+\.zip)"') | ForEach-Object { $_.Groups[1].Value }
Write-Host "Found $($allZips.Count) zip files on CrossWire" -ForegroundColor Green

# Build a case-insensitive lookup: lowercase zip name (without .zip) -> actual filename
$zipLookup = @{}
foreach ($z in $allZips) {
    $modName = $z -replace '\.zip$', ''
    $zipLookup[$modName.ToLower()] = $z
}

# Step 3: Download and extract each module
$success = 0
$skipped = 0
$failed = @()

foreach ($mod in $filtered) {
    $name = $mod.name
    $actualZip = $null
    
    # Look up exact filename (case-insensitive)
    if ($zipLookup.ContainsKey($name.ToLower())) {
        $actualZip = $zipLookup[$name.ToLower()]
    } else {
        # Try to find a close match
        $candidates = $allZips | Where-Object { $_ -replace '\.zip$', '' -eq $name } | Select-Object -First 1
        if ($candidates) { $actualZip = $candidates }
    }
    
    if (-not $actualZip) {
        Write-Host "[$name] SKIP - no zip found" -ForegroundColor DarkYellow
        $failed += "$name : No zip file found on CrossWire"
        continue
    }
    
    $zipUrl = "$repoUrl$actualZip"
    $zipFile = Join-Path $modulesPath "_tmp_$name.zip"
    $targetDir = Join-Path $modulesPath $name
    
    $idx = $success + $skipped + $failed.Count + 1
    Write-Host "[$idx/$($filtered.Count)] $name -> $actualZip ... " -NoNewline -ForegroundColor Cyan
    
    # Skip if already extracted
    if ((Test-Path "$targetDir\mods.d") -and (Test-Path "$targetDir\modules")) {
        Write-Host "[ALREADY EXISTS]" -ForegroundColor DarkGray
        $skipped++
        continue
    }
    
    try {
        # Download
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing -TimeoutSec 180
        
        # Extract
        if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $targetDir)
        
        # Handle nested directory
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
            $size = (Get-ChildItem $targetDir -Recurse | Measure-Object Length -Sum).Sum / 1MB
            Write-Host ("OK ({0:N1} MB)" -f $size) -ForegroundColor Green
            $success++
        } else {
            Write-Host "INVALID (missing mods.d or modules)" -ForegroundColor Red
            $failed += "$name : Invalid zip structure"
            if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force -ErrorAction SilentlyContinue }
        }
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed += "$name : $($_.Exception.Message)"
        if (Test-Path $zipFile) { Remove-Item $zipFile -Force -ErrorAction SilentlyContinue }
    }
    
    Start-Sleep -Milliseconds 300
}

Write-Host "`n=== Download Complete ===" -ForegroundColor Green
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Skipped (already exists): $skipped" -ForegroundColor DarkGray
Write-Host "Failed: $($failed.Count)" -ForegroundColor Red
if ($failed.Count -gt 0) {
    Write-Host "`nFailed modules:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

# Show total modules directory count
$totalDirs = (Get-ChildItem $modulesPath -Directory).Count
Write-Host "`nTotal module directories in $modulesPath : $totalDirs" -ForegroundColor Cyan
