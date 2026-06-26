$ftpUrl = "ftp://8.222.165.245/deploy-package/frontend/"
$user = "ccscw"
$pass = "godblessme"
$files = @(
    @{local="D:\dev\github\bible-microservices\frontend\index.html"; remote="index.html"},
    @{local="D:\dev\github\bible-microservices\frontend\js\app.js"; remote="js/app.js"},
    @{local="D:\dev\github\bible-microservices\frontend\modules.html"; remote="modules.html"}
)
foreach ($f in $files) {
    $uri = $ftpUrl + $f.remote
    Write-Host "Uploading $($f.local) -> $uri"
    $ftp = [System.Net.FtpWebRequest]::Create($uri)
    $ftp.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $ftp.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $ftp.UseBinary = $true
    $ftp.UsePassive = $true
    $content = [System.IO.File]::ReadAllBytes($f.local)
    $ftp.ContentLength = $content.Length
    $rs = $ftp.GetRequestStream()
    $rs.Write($content, 0, $content.Length)
    $rs.Close()
    $resp = $ftp.GetResponse()
    Write-Host "  Status: $($resp.StatusDescription)"
    $resp.Close()
}
Write-Host "Done."