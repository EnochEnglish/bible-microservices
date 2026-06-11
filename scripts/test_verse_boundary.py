import sys,io,zlib,re,struct
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')

with open(r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz",'rb') as f:
    data=f.read()
text=zlib.decompress(data[1110:]).decode('utf-8',errors='replace')
print(f'NT decompressed: {len(text)} chars')

# Strategy: detect verse boundaries by tracking <w> tags within chapter markers
# When src drops significantly, it's a new verse

# Parse: <chapter osisID="Matt.1"/> or <chapter ... osisID="Matt.1" .../>
chapters = list(re.finditer(r'<chapter\s+[^>]*osisID="([^"]+)"[^>]*/?>', text))
print(f'Chapters found: {len(chapters)}')

# For the first chapter, group words by verse
if chapters:
    ch_start = chapters[0].end()
    ch_name = chapters[0].group(1)  # e.g., "Matt.1"
    # Find next chapter or end of text
    ch_end = chapters[1].start() if len(chapters)>1 else len(text)
    chapter_text = text[ch_start:ch_end]
    
    # Extract all <w> tags in this chapter
    words = list(re.finditer(r'<w\s+([^>]*)>([^<]+)</w>', chapter_text))
    
    verses = []
    current_verse_words = []
    prev_src = 0
    
    for w in words:
        attrs = w.group(1)
        inner = w.group(2)
        src_m = re.search(r'src="(\d+)"', attrs)
        src = int(src_m.group(1)) if src_m else -1
        
        # Detect verse boundary: src drops significantly from previous
        if src >= 0 and src < prev_src - 15 and current_verse_words:
            verses.append(current_verse_words)
            current_verse_words = []
        elif src == 1 and prev_src == 0 and not current_verse_words:
            pass  # First word of first verse
        
        current_verse_words.append((src, inner, attrs))
        prev_src = src
    
    if current_verse_words:
        verses.append(current_verse_words)
    
    print(f'\nChapter {ch_name}: {len(verses)} verses')
    for vi, v in enumerate(verses[:5]):
        vtext = ' '.join(w[1] for w in v)
        print(f'  Verse {vi+1} ({len(v)} words): {vtext[:80]}...')

# Now test on multiple chapters
total_verses = 0
for ci in range(min(5, len(chapters))):
    ch_start = chapters[ci].end()
    ch_name = chapters[ci].group(1)
    ch_end = chapters[ci+1].start() if ci+1 < len(chapters) else min(len(text), ch_start+200000)
    chapter_text = text[ch_start:ch_end]
    words = list(re.finditer(r'<w\s+([^>]*)>([^<]+)</w>', chapter_text))
    
    verses = []
    current_verse_words = []
    prev_src = 0
    
    for w in words:
        src_m = re.search(r'src="(\d+)"', w.group(1))
        src = int(src_m.group(1)) if src_m else -1
        
        if src >= 0 and src < prev_src - 15 and current_verse_words:
            verses.append(current_verse_words)
            current_verse_words = []
        elif src == 1 and prev_src == 0 and not current_verse_words:
            pass
        
        current_verse_words.append((src,))
        prev_src = src
    
    if current_verse_words:
        verses.append(current_verse_words)
    
    total_verses += len(verses)
    print(f'  {ch_name}: {len(verses)} verses')

print(f'Total verses in first 5 chapters: {total_verses}')
