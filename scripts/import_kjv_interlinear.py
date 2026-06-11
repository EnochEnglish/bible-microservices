"""
import_kjv_interlinear.py
Import KJV Strong's interlinear word data from SWORD zText module.
Uses BZV index (10-byte entries) for precise verse boundary detection.
"""
import struct, zlib, sqlite3, os, sys, re
from pathlib import Path

MODULE_DIR = Path(__file__).parent.parent / "data" / "sword-mods" / "KJV" / "modules" / "texts" / "ztext" / "kjv"
DB_PATH = Path(__file__).parent.parent / "data" / "text-db.mv.db"

# ─── KJV NT Versification (book_id, name, chapter_count, verse_count) ───
KJV_NT = [
    ("Matt", "Matthew", 28, [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20]),
    ("Mark", "Mark", 16, [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20]),
    ("Luke", "Luke", 24, [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53]),
    ("John", "John", 21, [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25]),
    ("Acts", "Acts", 28, [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31]),
    ("Rom", "Romans", 16, [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27]),
    ("1Cor", "1 Corinthians", 16, [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24]),
    ("2Cor", "2 Corinthians", 13, [24,17,18,18,21,18,16,24,15,18,33,21,14]),
    ("Gal", "Galatians", 6, [24,21,29,31,26,18]),
    ("Eph", "Ephesians", 6, [23,22,21,32,33,24]),
    ("Phil", "Philippians", 4, [30,30,21,23]),
    ("Col", "Colossians", 4, [29,23,25,18]),
    ("1Thess", "1 Thessalonians", 5, [10,20,13,18,28]),
    ("2Thess", "2 Thessalonians", 3, [12,17,18]),
    ("1Tim", "1 Timothy", 6, [20,15,16,16,25,21]),
    ("2Tim", "2 Timothy", 4, [18,26,17,22]),
    ("Titus", "Titus", 3, [16,15,15]),
    ("Phlm", "Philemon", 1, [25]),
    ("Heb", "Hebrews", 13, [14,18,19,16,14,20,28,13,28,39,40,29,25]),
    ("Jas", "James", 5, [27,26,18,17,20]),
    ("1Pet", "1 Peter", 5, [25,25,22,19,14]),
    ("2Pet", "2 Peter", 3, [21,22,18]),
    ("1John", "1 John", 5, [10,29,24,21,21]),
    ("2John", "2 John", 1, [13]),
    ("3John", "3 John", 1, [15]),
    ("Jude", "Jude", 1, [25]),
    ("Rev", "Revelation", 22, [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]),
]

def read_bzv(path):
    """Read BZV index: 10-byte entries (blockNum:4, verseStart:4, verseSize:2)"""
    data = path.read_bytes()
    entries = []
    for i in range(0, len(data), 10):
        block_num, verse_start = struct.unpack_from('<II', data, i)
        verse_size = struct.unpack_from('<H', data, i + 8)[0]
        entries.append((block_num, verse_start, verse_size))
    return entries

def read_bzs(path):
    """Read BZS index: 12-byte entries (blockStart:4, compressedSize:4, uncompressedSize:4)"""
    data = path.read_bytes()
    entries = []
    for i in range(0, len(data), 12):
        block_start = struct.unpack_from('<I', data, i)[0]
        compressed_size = struct.unpack_from('<I', data, i + 4)[0]
        uncompressed_size = struct.unpack_from('<I', data, i + 8)[0]
        entries.append((block_start, compressed_size, uncompressed_size))
    return entries

def decompress_block(data, block_start, compressed_size):
    """Extract and decompress a zlib-compressed block."""
    raw = data[block_start:block_start + compressed_size]
    return zlib.decompress(raw).decode('utf-8', errors='replace')

def parse_w_tags(text):
    """Extract <w> tags from verse text."""
    w_tags = []
    for m in re.finditer(
        r'<w\s+(?:src="(\d+)"\s+)?(?:lemma="([^"]*)"\s+)?(?:lemma\.TR="([^"]*)"\s+)?(?:morph="([^"]*)"\s+)?(?:pos="([^"]*)"\s+)?/>'
        r'|'
        r'(?:^|\s)([A-Za-z\u0370-\u03FF\u0591-\u05F4]+(?:\s*[A-Za-z\u0370-\u03FF\u0591-\u05F4]+)*?)\s*(?=\s|<|$|\.)',
        text):
        if m.group(1) or m.group(2) or m.group(3):
            # <w> tag entry
            lemma_val = m.group(2) or ''
            greek = m.group(3) or ''
            # Extract Strong's number
            strong = ''
            if 'strong:' in lemma_val:
                strong = lemma_val.split('strong:')[1].split(' ')[0]
            elif 'strongs:' in lemma_val:
                strong = lemma_val.split('strongs:')[1].split(' ')[0]
            w_tags.append({
                'src': m.group(1) or '0',
                'lemma': lemma_val,
                'greek': greek,
                'morph': m.group(4) or '',
                'strong': strong,
                'type': 'w'
            })
    return w_tags

def build_verse_map(bzv_entries):
    """Build a map: verse_ordinal -> (book_id, chapter, verse)"""
    verse_map = {}
    ordinal = 0
    for book_id, name, ch_count, v_counts in KJV_NT:
        for ch_idx in range(ch_count):
            for v_idx in range(v_counts[ch_idx]):
                verse_map[ordinal] = (book_id, ch_idx + 1, v_idx + 1)
                ordinal += 1
    return verse_map

def main():
    nt_bzz = MODULE_DIR / "nt.bzz"
    nt_bzv = MODULE_DIR / "nt.bzv"
    nt_bzs = MODULE_DIR / "nt.bzs"
    
    print(f"Reading {nt_bzv.name}...")
    bzv = read_bzv(nt_bzv)
    print(f"  {len(bzv)} BZV entries")
    
    bzs = read_bzs(nt_bzs)
    print(f"  {len(bzs)} BZS entries")
    
    verse_map = build_verse_map(bzv)
    print(f"  {len(verse_map)} verses in verse map")
    
    # Group verses by block
    block_verses = {}
    for verse_ord, (block_num, verse_start, verse_size) in enumerate(bzv):
        if verse_size == 0:
            continue  # Skip zero-size entries (title blocks)
        if block_num not in block_verses:
            block_verses[block_num] = []
        block_verses[block_num].append((verse_ord, verse_start, verse_size))
    
    print(f"\n{len(block_verses)} blocks with verses")
    for bn in sorted(block_verses.keys()):
        verses = block_verses[bn]
        first_v = verse_map.get(verses[0][0], ('?', 0, 0))
        last_v = verse_map.get(verses[-1][0], ('?', 0, 0))
        print(f"  Block {bn}: verses {verses[0][0]}-{verses[-1][0]} "
              f"({first_v[0]}.{first_v[1]}:{first_v[2]} - {last_v[0]}.{last_v[1]}:{last_v[2]})")
    
    # Decompress all blocks and extract verses
    bzz_data = nt_bzz.read_bytes()
    total_w_tags = 0
    results = []
    
    for block_num in sorted(block_verses.keys()):
        verses = block_verses[block_num]
        bs_info = bzs[block_num]
        block_start, compressed_size = bs_info[0], bs_info[1]
        text = decompress_block(bzz_data, block_start, compressed_size)
        
        for verse_ord, verse_start, verse_size in verses:
            verse_text = text[verse_start:verse_start + verse_size]
            w_tags = parse_w_tags(verse_text)
            total_w_tags += len(w_tags)
            
            ref = verse_map.get(verse_ord, (f'B{verse_ord}', 1, 1))
            results.append({
                'ordinal': verse_ord,
                'book_id': ref[0],
                'chapter': ref[1],
                'verse': ref[2],
                'w_count': len(w_tags),
                'w_tags': w_tags,
                'text_preview': verse_text[:120].replace('\n', ' ')
            })
    
    print(f"\nTotal <w> tags found: {total_w_tags}")
    print(f"Total verses with <w> tags: {sum(1 for r in results if r['w_count'] > 0)}")
    
    # Show sample output
    print("\n=== Sample verses ===")
    for r in results[:20]:
        print(f"\n{r['book_id']} {r['chapter']}:{r['verse']} ({r['w_count']} words):")
        print(f"  Text: {r['text_preview'][:100]}")
        for w in r['w_tags'][:5]:
            print(f"    <w src={w['src']} strong={w['strong']} greek={w['greek'][:30]}>")

if __name__ == '__main__':
    main()
