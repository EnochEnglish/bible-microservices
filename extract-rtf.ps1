# PowerShell script: Extract text from Word DOC files using Word COM Automation
# Handles both RTF and OLE2 (binary Word) formats

param(
    [Parameter(Mandatory=$true)]
    [string]$RTF_FILE,
    
    [Parameter(Mandatory=$true)]
    [string]$OUT_FILE
)

# Read first bytes to detect format
$bytes = [System.IO.File]::ReadAllBytes($RTF_FILE)
$header = [System.Text.Encoding]::ASCII.GetString($bytes[0..5])

if ($header.StartsWith("{\rtf")) {
    # RTF format - use RichTextBox
    Add-Type -AssemblyName System.Windows.Forms
    $rtb = New-Object System.Windows.Forms.RichTextBox
    $rtfContent = [System.IO.File]::ReadAllText($RTF_FILE, [System.Text.Encoding]::GetEncoding("GB2312"))
    $rtb.Rtf = $rtfContent
    [System.IO.File]::WriteAllText($OUT_FILE, $rtb.Text, [System.Text.UTF8Encoding]::new($false))
} elseif ($bytes[0] -eq 0xD0 -and $bytes[1] -eq 0xCF) {
    # OLE2 format - use Word COM Automation
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    try {
        $doc = $word.Documents.Open($RTF_FILE, $false, $true)  # ReadOnly
        $text = $doc.Content.Text
        [System.IO.File]::WriteAllText($OUT_FILE, $text, [System.Text.UTF8Encoding]::new($false))
        $doc.Close($false)
    } finally {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
} else {
    # Try as plain text with GB2312
    $text = [System.IO.File]::ReadAllText($RTF_FILE, [System.Text.Encoding]::GetEncoding("GB2312"))
    [System.IO.File]::WriteAllText($OUT_FILE, $text, [System.Text.UTF8Encoding]::new($false))
}
