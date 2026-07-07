# PowerShell script to extract text from RTF/DOC files using .NET RichTextBox
# .NET RichTextBox can natively parse RTF including GBK encoded content

Add-Type -AssemblyName System.Windows.Forms

function Extract-RtfText {
    param([string]$filePath)
    
    $rtb = New-Object System.Windows.Forms.RichTextBox
    $rtb.Rtf = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::GetEncoding("GB2312"))
    return $rtb.Text
}

# Test with one file
$testFile = "D:\dev\usebible.com\html\blessed\chinese\download\onetoone\onetoone-ch.doc"
$text = Extract-RtfText $testFile
Write-Host "Extracted length: $($text.Length) chars"
$chineseCount = ([regex]::Matches($text, '[\u4e00-\u9fff]')).Count
Write-Host "Chinese chars: $chineseCount"
Write-Host "First 500 chars:"
Write-Host $text.Substring(0, [Math]::Min(500, $text.Length))
