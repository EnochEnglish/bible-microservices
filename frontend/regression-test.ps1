$Root="D:\dev\github\bible-microservices\frontend";$e=0
#1 Chinese integrity
$zh=@(229,156,163,231,187,143)
$html=@("index.html","admin.html","modules.html")
foreach($f in $html){$b=[IO.File]::ReadAllBytes("$Root/$f");$ok=0;for($i=0;$i-le $b.Length-6;$i++){if($b[$i]-eq229){$ok=1;break}};if($ok){Write-Host "PASS: $f"}else{Write-Host "FAIL: $f";$e++}}
#2 BOM
Get-ChildItem "$Root\js\*.js"|?{$_.Name -notmatch "test_"}|%{$b=[IO.File]::ReadAllBytes($_.FullName);if($b[0]-eq0xEF){Write-Host "BOM: $($_.Name)";$e++}else{Write-Host "OK: $($_.Name)"}}
#3 Syntax
Get-ChildItem "$Root\js\*.js"|%{$r=node -c $_.FullName 2>&1;if($LASTEXITCODE){Write-Host "SYNTAX: $($_.Name)";$e++}}
#4 Size
if((Get-Item "$Root\js\app.js").Length -lt 100000){Write-Host "TRUNCATED: app.js";$e++}
if($e -eq 0){Write-Host "ALL PASSED"}else{Write-Host "FAILED: $e errors";exit 1}
