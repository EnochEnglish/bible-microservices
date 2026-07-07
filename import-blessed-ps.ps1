# PowerShell: Batch extract all blessed.org DOC files to library-data JSON
Add-Type -AssemblyName System.Windows.Forms

$SRC_BASE = "D:\dev\usebible.com\html\blessed\chinese\download"
$DST_BASE = "D:\dev\github\bible-microservices\frontend\library-data"

# Catalog: dir, file, title, titleEn, author, category, icon
$CATALOG = @(
    @{dir='badgood'; file='bog-ch.doc'; title='福音桥'; titleEn='Bridge of the Gospel'; cat='福音'; icon='✝️'}
    @{dir='badgood'; file='badgood-ch.doc'; title='坏消息与好消息'; titleEn='Bad News and Good News'; cat='福音'; icon='✝️'}
    @{dir='badgood'; file='blaka-ch.doc'; title='黑暗中的光'; titleEn='Light in the Darkness'; cat='福音'; icon='✝️'}
    @{dir='johnstudy'; file='johnstudy-ch.doc'; title='约翰福音学习'; titleEn='John Bible Study'; cat='福音'; icon='✝️'}
    @{dir='onetoone'; file='onetoone-ch.doc'; title='一对一门徒训练'; titleEn='One-to-One Discipleship'; cat='门徒训练'; icon='👣'}
    @{dir='newlife'; file='newlife-ch.doc'; title='新生命'; titleEn='New Life'; cat='门徒训练'; icon='👣'}
    @{dir='newlive'; file='newlive-ch.doc'; title='新生活'; titleEn='New Living'; cat='门徒训练'; icon='👣'}
    @{dir='equipsaints'; file='etsbook1-ch.doc'; title='圣徒装备（第一册）'; titleEn='Equipping the Saints Vol.1'; cat='圣徒装备'; icon='🛡️'}
    @{dir='equipsaints'; file='etsbook2-ch.doc'; title='圣徒装备（第二册）'; titleEn='Equipping the Saints Vol.2'; cat='圣徒装备'; icon='🛡️'}
    @{dir='equipsaints'; file='etsbook3-ch.doc'; title='圣徒装备（第三册）'; titleEn='Equipping the Saints Vol.3'; cat='圣徒装备'; icon='🛡️'}
    @{dir='equipsaints'; file='etsbook4-ch.doc'; title='圣徒装备（第四册）'; titleEn='Equipping the Saints Vol.4'; cat='圣徒装备'; icon='🛡️'}
    @{dir='expgod'; file='jword-ch.doc'; title='耶稣基督之言之行'; titleEn='Words and Deeds of Jesus Christ'; cat='圣徒装备'; icon='🛡️'}
    @{dir='expgod'; file='murheir-ch.doc'; title='信徒的基业'; titleEn='Heir of the Believer'; cat='圣徒装备'; icon='🛡️'}
    @{dir='theology'; file='theology-ch.doc'; title='系统神学'; titleEn='Systematic Theology'; cat='神学'; icon='📚'}
    @{dir='theology'; file='ryriedoc-ch.doc'; title='Ryrie神学摘要'; titleEn='Ryrie Theology Summary'; cat='神学'; icon='📚'}
    @{dir='theology'; file='windevil-ch.doc'; title='胜过魔鬼'; titleEn='Winning Over the Devil'; cat='神学'; icon='📚'}
    @{dir='bcf'; file='bcf-ch.doc'; title='自我面对'; titleEn='Self-Confrontation'; cat='神学'; icon='📚'}
    @{dir='bstudymet'; file='followX-ch.doc'; title='跟随基督'; titleEn='Following Christ'; cat='查经'; icon='🔍'}
    @{dir='bstudymet'; file='1jn-ch.doc'; title='约翰一书归纳法查经'; titleEn='1 John Inductive Study'; cat='查经'; icon='🔍'}
    @{dir='bstudymet'; file='1thes-ch.doc'; title='帖撒罗尼迦前书查经'; titleEn='1 Thessalonians Study'; cat='查经'; icon='🔍'}
    @{dir='bstudymet'; file='gifts-ch.doc'; title='圣灵的恩赐'; titleEn='Spiritual Gifts'; cat='查经'; icon='🔍'}
    @{dir='bstudymet'; file='bstudymet-ch.doc'; title='查经方法'; titleEn='Bible Study Methods'; cat='查经'; icon='🔍'}
    @{dir='bstudymet'; file='preaching-ch.doc'; title='讲道学'; titleEn='Preaching'; cat='查经'; icon='🔍'}
    @{dir='genstudy'; file='genstudy-ch.doc'; title='创世记研读'; titleEn='Genesis Study'; cat='查经'; icon='🔍'}
    @{dir='newtest'; file='luke-ch.doc'; title='路加福音归纳法查经'; titleEn='Luke Inductive Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='mark-ch.doc'; title='马可福音查经'; titleEn='Mark Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='acts-ch.doc'; title='使徒行传查经'; titleEn='Acts Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='romans-ch.doc'; title='罗马书查经'; titleEn='Romans Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='1timothy-ch.doc'; title='提摩太前书查经'; titleEn='1 Timothy Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='galatian-ch.doc'; title='加拉太书查经'; titleEn='Galatians Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='ephetians-ch.doc'; title='以弗所书查经'; titleEn='Ephesians Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='philippians-ch.doc'; title='腓立比书查经'; titleEn='Philippians Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='colossians-ch.doc'; title='歌罗西书查经'; titleEn='Colossians Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='james-ch.doc'; title='雅各书查经'; titleEn='James Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='revelation-ch.doc'; title='启示录查经'; titleEn='Revelation Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='philemon-ch.doc'; title='腓利门书查经'; titleEn='Philemon Study'; cat='新约注释'; icon='📖'}
    @{dir='newtest'; file='romansol-ch.doc'; title='罗马书大纲'; titleEn='Romans Outline'; cat='新约注释'; icon='📖'}
    @{dir='oldtest'; file='isaiah-ch.doc'; title='以赛亚书查经'; titleEn='Isaiah Study'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='jeremiah-ch.doc'; title='耶利米书查经'; titleEn='Jeremiah Study'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='ezekiel-ch.doc'; title='以西结书查经'; titleEn='Ezekiel Study'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='daniel-ch.doc'; title='但以理书查经'; titleEn='Daniel Study'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='otwenti-ch.doc'; title='旧约概览'; titleEn='OT Survey'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='minprophet1-ch.doc'; title='小先知书查经（上）'; titleEn='Minor Prophets Study 1'; cat='旧约注释'; icon='📖'}
    @{dir='oldtest'; file='lam_miproph2-ch.doc'; title='小先知书查经（下）'; titleEn='Minor Prophets Study 2'; cat='旧约注释'; icon='📖'}
    @{dir='bee'; file='galbee-ch.doc'; title='BEE加拉太书'; titleEn='BEE Galatians'; cat='BEE课程'; icon='🐝'}
    @{dir='bee'; file='rombee-ch.doc'; title='BEE罗马书'; titleEn='BEE Romans'; cat='BEE课程'; icon='🐝'}
    @{dir='joy'; file='joybook1-ch.doc'; title='JOY研经1：认识神之路'; titleEn='JOY Study 1'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook2-ch.doc'; title='JOY研经2：信徒的改变'; titleEn='JOY Study 2'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook3-ch.doc'; title='JOY研经3：信徒的价值观'; titleEn='JOY Study 3'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook4-ch.doc'; title='JOY研经4：神的仆人'; titleEn='JOY Study 4'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook5-ch.doc'; title='JOY研经5：合神心意'; titleEn='JOY Study 5'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook6-ch.doc'; title='JOY研经6：以神为中心'; titleEn='JOY Study 6'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook7-ch.doc'; title='JOY研经7：作个好领袖'; titleEn='JOY Study 7'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook8-ch.doc'; title='JOY研经8：完整的门徒训练'; titleEn='JOY Study 8'; cat='JOY研经'; icon='🌟'}
    @{dir='joy'; file='joybook10-ch.doc'; title='JOY研经10：活出神荣耀'; titleEn='JOY Study 10'; cat='JOY研经'; icon='🌟'}
    @{dir='sermon1'; file='psalm-ch.doc'; title='诗篇讲道'; titleEn='Psalms Sermons'; cat='讲道'; icon='🎙️'}
    @{dir='sermon1'; file='cor-ch.doc'; title='哥林多前书讲道'; titleEn='1 Corinthians Sermons'; cat='讲道'; icon='🎙️'}
    @{dir='sermon1'; file='jnpreach-ch.doc'; title='约翰福音讲道'; titleEn='John Sermons'; cat='讲道'; icon='🎙️'}
    @{dir='sermon1'; file='ashcraft-ch.doc'; title='讲道集'; titleEn='Sermon Collection'; cat='讲道'; icon='🎙️'}
    @{dir='apolo'; file='apolo-ch.doc'; title='护教学'; titleEn='Apologetics'; cat='护教'; icon='🛡️'}
    @{dir='heretics'; file='heretics-ch.doc'; title='异端'; titleEn='Heretics'; cat='护教'; icon='🛡️'}
    @{dir='childmin'; file='kidteach-ch.doc'; title='儿童教导法（上）'; titleEn='Children Ministry Teaching 1'; cat='儿童教育'; icon='👶'}
    @{dir='childmin'; file='kidteach2-ch.doc'; title='儿童教导法（下）'; titleEn='Children Ministry Teaching 2'; cat='儿童教育'; icon='👶'}
    @{dir='resource'; file='yuwen-ch.doc'; title='四个版本的中文阅读'; titleEn='Four Chinese Bible Versions'; cat='资源'; icon='📋'}
)

function Extract-RtfText {
    param([string]$filePath)
    $rtb = New-Object System.Windows.Forms.RichTextBox
    $rtfContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::GetEncoding("GB2312"))
    $rtb.Rtf = $rtfContent
    return $rtb.Text
}

function Split-Chapters {
    param([string]$text)
    
    # Try pattern: 第X课/第X章/第X讲
    $matches = [regex]::Matches($text, '第[一二三四五六七八九十百零\d]+[课章讲篇]')
    if ($matches.Count -gt 1) {
        $chapters = @()
        for ($i = 0; $i -lt $matches.Count; $i++) {
            $start = $matches[$i].Index
            $end = if ($i + 1 -lt $matches.Count) { $matches[$i+1].Index } else { $text.Length }
            $title = $matches[$i].Value
            $content = $text.Substring($start, $end - $start).Trim()
            if ($content.Length -gt 50) {
                $chapters += @{ title = $title; content = $content }
            }
        }
        if ($chapters.Count -gt 0) { return $chapters }
    }
    
    # If text is long, split by ~3000 char sections
    if ($text.Length -gt 10000) {
        $sections = $text -split '\n\n+' | Where-Object { $_.Trim().Length -gt 100 }
        if ($sections.Count -gt 5) {
            $chapters = @()
            $current = ""
            $chTitle = "前言"
            $chNum = 0
            foreach ($sec in $sections) {
                $trimmed = $sec.Trim()
                $isHeading = ($trimmed.Length -lt 80) -and ($trimmed -match '^[一二三四五六七八九十\d第]')
                if ($isHeading -and $current.Length -gt 500) {
                    $chapters += @{ title = $chTitle; content = $current.Trim() }
                    $chNum++
                    $chTitle = ($trimmed -split '\n')[0]
                    $current = ""
                }
                if ($current.Length -gt 3000 -and -not $isHeading) {
                    $chapters += @{ title = $chTitle; content = $current.Trim() }
                    $chNum++
                    $chTitle = "第$($chNum + 1)部分"
                    $current = ""
                }
                $current += $trimmed + "`n`n"
            }
            if ($current.Trim()) {
                $chapters += @{ title = $chTitle; content = $current.Trim() }
            }
            if ($chapters.Count -gt 0) { return $chapters }
        }
    }
    
    # Fallback: whole as one chapter
    return @(@{ title = '全文'; content = $text })
}

# Main
Write-Host "=== Blessed.org DOC → Library Import (PowerShell+NET) ===" -ForegroundColor Green

$totalFiles = 0
$totalChars = 0
$totalChinese = 0
$allBooks = @()

foreach ($item in $CATALOG) {
    $filePath = Join-Path $SRC_BASE "$($item.dir)\$($item.file)"
    $baseName = $item.file.Replace('.doc', '')
    $bookCode = "bl_" + $baseName.Replace('-', '_')
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  SKIP: $($item.file) not found" -ForegroundColor Yellow
        continue
    }
    
    try {
        $text = Extract-RtfText $filePath
        $chineseCount = ([regex]::Matches($text, '[\u4e00-\u9fff]')).Count
        
        if ($text.Length -lt 50 -or $chineseCount -lt 5) {
            Write-Host "  WARN: $($item.file) → $bookCode: $($text.Length)chars, $chineseCount Chinese" -ForegroundColor Yellow
        }
        
        $chapters = Split-Chapters -text $text
        
        # Create output directory
        $outDir = Join-Path $DST_BASE $bookCode
        if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
        
        # Write meta.json
        $meta = @{
            code = $bookCode
            title = $item.title
            titleEn = $item.titleEn
            author = 'Blessed.org'
            source = 'blessed.org'
            category = $item.cat
            icon = $item.icon
            chapters = $chapters.Count
        }
        $metaJson = $meta | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText((Join-Path $outDir 'meta.json'), $metaJson, [System.Text.UTF8Encoding]::new($false))
        
        # Write chapter files
        for ($i = 0; $i -lt $chapters.Count; $i++) {
            $ch = $chapters[$i]
            $chJson = @{ id = $i + 1; title = $ch.title; content = $ch.content } | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText((Join-Path $outDir "$($i+1).json"), $chJson, [System.Text.UTF8Encoding]::new($false))
        }
        
        $totalFiles++
        $totalChars += $text.Length
        $totalChinese += $chineseCount
        
        $bookEntry = @{
            code = $bookCode
            title = $item.title
            titleEn = $item.titleEn
            author = 'Blessed.org'
            category = $item.cat
            icon = $item.icon
            chapters = $chapters.Count
            source = 'blessed.org'
        }
        $allBooks += $bookEntry
        
        Write-Host "  OK: $($item.file) → $bookCode : $($chapters.Count)ch, $($text.Length)chars, $chineseCount Chinese"
    } catch {
        Write-Host "  ERROR: $($item.file) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Merge with existing index.json (keep non-bl_ books)
$indexFile = Join-Path $DST_BASE 'index.json'
$existingBooks = @()
if (Test-Path $indexFile) {
    try {
        $existing = Get-Content $indexFile -Raw | ConvertFrom-Json
        $existingBooks = $existing.books | Where-Object { -not $_.code.StartsWith('bl_') }
    } catch {}
}

$merged = @()
$merged += $existingBooks | ForEach-Object { @{
    code=$_.code; title=$_.title; titleEn=$_.titleEn; author=$_.author
    category=$_.category; icon=$_.icon; chapters=$_.chapters
    source=$_.source
}}
$merged += $allBooks

$indexObj = @{
    totalBooks = $merged.Count
    totalChapters = ($merged | Measure-Object -Property chapters -Sum).Sum
    books = $merged
}
$indexJson = $indexObj | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($indexFile, $indexJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Files: $totalFiles"
Write-Host "Total chars: $totalChars"
Write-Host "Chinese chars: $totalChinese"
Write-Host "Library: $($merged.Count) books, $(($merged | Measure-Object -Property chapters -Sum).Sum) chapters"
Write-Host "Done!"
