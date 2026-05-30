"""Parse OSIS commentary text and extract per-verse entries."""
import zlib, re, os, html
from html.parser import HTMLParser

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

OSIS_TO_STANDARD = {
    'Matt': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
    'Acts': 'ACT', 'Rom': 'ROM', '1Cor': '1CO', '2Cor': '2CO',
    'Gal': 'GAL', 'Eph': 'EPH', 'Phil': 'PHP', 'Col': 'COL',
    '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI', '2Tim': '2TI',
    'Titus': 'TIT', 'Phlm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS',
    '1Pet': '1PE', '2Pet': '2PE', '1John': '1JO', '2John': '2JO',
    '3John': '3JO', 'Jude': 'JUD', 'Rev': 'REV',
    'Gen': 'GEN', 'Exod': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deut': 'DEU',
    'Josh': 'JOS', 'Judg': 'JDG', 'Ruth': 'RUT', '1Sam': '1SA', '2Sam': '2SA',
    '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH',
    'Ezra': 'EZR', 'Neh': 'NEH', 'Esth': 'EST', 'Job': 'JOB',
    'Ps': 'PSA', 'Prov': 'PRO', 'Eccl': 'ECC', 'Song': 'SNG',
    'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM', 'Ezek': 'EZK',
    'Dan': 'DAN', 'Hos': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
    'Obad': 'OBA', 'Jonah': 'JON', 'Mic': 'MIC', 'Nah': 'NAM',
    'Hab': 'HAB', 'Zeph': 'ZEP', 'Hag': 'HAG', 'Zech': 'ZEC', 'Mal': 'MAL',
}

def strip_tags(text):
    """Remove OSIS/HTML tags, keep text content."""
    # Remove all XML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_osis_commentary(text):
    """Parse OSIS commentary text into per-verse entries."""
    commentaries = []
    
    # Find all books
    book_pattern = re.compile(
        r'<div\s+canonical="true"\s+osisID="([^"]+)"[^>]*/?>',
        re.IGNORECASE
    )
    chapter_pattern = re.compile(
        r'<chapter\s+n="(\d+)"\s+osisID="([^"]+)"[^>]*/?>',
        re.IGNORECASE
    )
    verse_pattern = re.compile(
        r'<verse\s+osisID="([^"]+)"\s+n="(\d+)"\s+sID="([^"]+)"\s*/>',
        re.IGNORECASE
    )
    
    # Strategy: find verses and extract text between verse markers
    # Simplified: find all verse markers and split text by them
    
    # First, find all verse positions
    verse_matches = list(verse_pattern.finditer(text))
    chapter_matches = list(chapter_pattern.finditer(text))
    book_matches = list(book_pattern.finditer(text))
    
    print(f"  Found: {len(book_matches)} books, {len(chapter_matches)} chapters, {len(verse_matches)} verses")
    
    # Build a timeline: book start, chapter start, verse start
    
    # Simpler approach: walk through text character by character using regex splits
    # Split by verse markers, tracking context
    
    # Method: iterate verse markers, extract text between them
    current_book = None
    current_chapter = None
    
    # Parse all markers into timeline
    markers = []
    
    for m in book_matches:
        markers.append((m.start(), 'book', m.group(1)))
    for m in chapter_matches:
        markers.append((m.start(), 'chapter', m.group(1), m.group(2)))
    for m in verse_matches:
        markers.append((m.start(), 'verse', m.group(1), int(m.group(2))))
    
    markers.sort(key=lambda x: x[0])
    
    # Process each verse
    for i, m in enumerate(markers):
        if m[1] != 'verse':
            if m[1] == 'book':
                current_book = OSIS_TO_STANDARD.get(m[2], m[2].upper())
            elif m[1] == 'chapter':
                current_chapter = int(m[2])
            continue
        
        # This is a verse marker
        verse_osis = m[2]
        verse_num = m[3]
        
        # Find next marker to get end position
        next_pos = len(text)
        if i + 1 < len(markers):
            next_pos = markers[i + 1][0]
        
        # Extract text between this verse marker and next marker
        raw_text = text[m[0]:next_pos]
        
        # Strip the verse marker itself and tags
        clean = strip_tags(raw_text)
        
        if clean and current_book and current_chapter:
            commentaries.append({
                'bookId': current_book,
                'chapter': current_chapter,
                'verseStart': verse_num,
                'verseEnd': verse_num,
                'text': clean
            })
    
    return commentaries

# Test with MHCC NT
print("=== MHCC NT ===")
path = os.path.join(base, 'MHCC', 'modules', 'comments', 'zcom', 'mhcc', 'nt.bzz')
with open(path, 'rb') as f:
    data = f.read()
nt_text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')
print(f"  Decompressed: {len(nt_text):,} chars")

commentaries = parse_osis_commentary(nt_text)
print(f"  Extracted: {len(commentaries)} verses")

if commentaries:
    print(f"\n  First 3 entries:")
    for c in commentaries[:3]:
        print(f"    {c['bookId']} {c['chapter']}:{c['verseStart']} -> {c['text'][:150]}")
    print(f"\n  Last 3 entries:")
    for c in commentaries[-3:]:
        print(f"    {c['bookId']} {c['chapter']}:{c['verseStart']} -> {c['text'][:150]}")

# Test with JFB NT
print(f"\n=== JFB NT ===")
path = os.path.join(base, 'JFB', 'modules', 'comments', 'zcom', 'jfb', 'nt.bzz')
with open(path, 'rb') as f:
    data = f.read()
jfb_nt = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')
print(f"  Decompressed: {len(jfb_nt):,} chars")

jfb_commentaries = parse_osis_commentary(jfb_nt)
print(f"  Extracted: {len(jfb_commentaries)} verses")
if jfb_commentaries:
    for c in jfb_commentaries[:3]:
        print(f"    {c['bookId']} {c['chapter']}:{c['verseStart']} -> {c['text'][:150]}")