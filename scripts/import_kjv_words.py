"""
KJV Strong's Word-Level Importer

Parses local CrossWire SWORD KJV module, extracts <w> word-level annotations
(Strong's numbers, Greek/Hebrew lemmas, Robinson morphology codes),
and imports directly into the H2 words table via JDBC.

Data source: D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\
Format: zText - BZS index entries (offset,size) → BZZ zlib compressed blocks of OSIS XML
"""

import os
import zlib
import re
import sys
import jaydebeapi

# ============== CONFIG ==============

SWORD_KJV = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv"
H2_JAR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar"
DB_URL = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db"
DB_USER = "sa"
DB_PASS = ""

VERSE_KEY_MAP = {
    'Gen': 'gen', 'Exod': 'exo', 'Lev': 'lev', 'Num': 'num', 'Deut': 'deu',
    'Josh': 'jos', 'Judg': 'jdg', 'Ruth': 'rut', '1Sam': '1sa', '2Sam': '2sa',
    '1Kgs': '1ki', '2Kgs': '2ki', '1Chr': '1ch', '2Chr': '2ch', 'Ezra': 'ezr',
    'Neh': 'neh', 'Esth': 'est', 'Job': 'job', 'Ps': 'psa', 'Prov': 'pro',
    'Eccl': 'ecc', 'Song': 'sng', 'Isa': 'isa', 'Jer': 'jer', 'Lam': 'lam',
    'Ezek': 'eze', 'Dan': 'dan', 'Hos': 'hos', 'Joel': 'jol', 'Amos': 'amo',
    'Obad': 'oba', 'Jonah': 'jon', 'Mic': 'mic', 'Nah': 'nam', 'Hab': 'hab',
    'Zeph': 'zep', 'Hag': 'hag', 'Zech': 'zec', 'Mal': 'mal',
    'Matt': 'mat', 'Mark': 'mrk', 'Luke': 'luk', 'John': 'jhn',
    'Acts': 'act', 'Rom': 'rom', '1Cor': '1co', '2Cor': '2co',
    'Gal': 'gal', 'Eph': 'eph', 'Phil': 'php', 'Col': 'col',
    '1Thess': '1th', '2Thess': '2th', '1Tim': '1ti', '2Tim': '2ti',
    'Titus': 'tit', 'Phlm': 'phm', 'Heb': 'heb', 'Jas': 'jas',
    '1Pet': '1pe', '2Pet': '2pe', '1John': '1jn', '2John': '2jn',
    '3John': '3jn', 'Jude': 'jud', 'Rev': 'rev',
}

BATCH_SIZE = 500

# ============== HELPERS ==============

def find_zlib_blocks(bzz_path):
    """Scan file for zlib magic bytes 0x78 (78 01, 78 9C, 78 DA, 78 5E)."""
    with open(bzz_path, 'rb') as f:
        data = f.read()
    
    blocks = []
    i = 0
    while i < len(data) - 1:
        if data[i] == 0x78 and data[i+1] in (0x01, 0x9C, 0xDA, 0x5E):
            blocks.append(i)
        i += 1
    
    print(f"  Found {len(blocks)} potential zlib blocks in {os.path.basename(bzz_path)}")
    return data, blocks


def decompress_zlib(data, offset, max_chars=10_000_000):
    """Decompress zlib block starting at offset."""
    try:
        decompressed = zlib.decompress(data[offset:])
        text = decompressed.decode('utf-8', errors='replace')
        return text[:max_chars]
    except Exception as e:
        return None


def extract_words_from_xml(xml_text):
    """Extract <w> elements with Strong's/lemma/morph attributes."""
    # Pattern matches <w ...>TEXT</w> including various attributes
    w_pattern = re.compile(
        r'<w\s+'
        r'(?:lemma="([^"]*)"\s*)?'
        r'(?:lemma\.TR="([^"]*)"\s*)?'
        r'(?:morph="([^"]*)"\s*)?'
        r'(?:src="(\d+)(p?)?"?\s*)?'
        r'(?:[^>]*\s*)*>'
        r'(.*?)'
        r'</w>',
        re.DOTALL
    )
    
    words = []
    for m in w_pattern.finditer(xml_text):
        lemma = m.group(1) or ''
        lemma_tr = m.group(2) or ''
        morph = m.group(3) or ''
        src = m.group(4) or '0'
        is_paren = m.group(5) == 'p'
        text = m.group(6).strip()
        
        # Extract Strong's number(s) from lemma attribute
        strongs_nums = []
        if lemma:
            strongs_nums = re.findall(r'strong:([GH]\d+)', lemma)
        
        words.append({
            'position': int(src),
            'text': text,
            'strongs': '+'.join(strongs_nums) if strongs_nums else '',
            'lemma': lemma_tr if lemma_tr else '',
            'morphology': morph,
            'is_parenthetical': is_paren
        })
    
    return words


def parse_milestone_verses(xml_text):
    """
    Parse OSIS XML with milestone-style verse markers:
    <verse sID="Gen.1.1"/><w>...</w>...<verse eID="Gen.1.1"/>
    
    Returns list of {verse_key, words[]}
    """
    # Split by verse sID markers to isolate verse sections
    verse_pattern = re.compile(
        r'<verse\s+sID="([^"]+)"\s*/>'
        r'(.*?)'
        r'<verse\s+eID="[^"]*"\s*/>',
        re.DOTALL
    )
    
    verses = []
    for m in verse_pattern.finditer(xml_text):
        verse_key = m.group(1)  # e.g. "Gen.1.1"
        verse_content = m.group(2)
        
        # Normalize verse key: "Gen.1.1" → "kjv.gen.1.1"
        # DB format is: {translation_code}.{book_id}.{chapter}.{verse}
        parts = verse_key.split('.')
        if len(parts) == 3:
            book_osis = parts[0]
            # Map from SWORD book abbreviation to our OSIS id
            for sword_abbr, osis_id in VERSE_KEY_MAP.items():
                if book_osis.lower() == sword_abbr.lower():
                    book_osis = osis_id
                    break
            verse_key_norm = f"kjv.{book_osis.lower()}.{parts[1]}.{parts[2]}"
        else:
            # Already normalized or unknown format
            verse_key_norm = f"kjv.{verse_key.lower()}"
        
        words = extract_words_from_xml(verse_content)
        if words:
            verses.append({'verse_key': verse_key_norm, 'words': words})
    
    return verses


# ============== MAIN ==============

def main():
    bzz_dir = SWORD_KJV
    ot_path = os.path.join(bzz_dir, 'ot.bzz')
    nt_path = os.path.join(bzz_dir, 'nt.bzz')
    
    print("=" * 60)
    print("KJV Strong's Word-Level Importer")
    print("=" * 60)
    
    # Connect to H2
    print("\nConnecting to H2 database...")
    conn = jaydebeapi.connect(
        'org.h2.Driver',
        DB_URL,
        [DB_USER, DB_PASS],
        H2_JAR
    )
    conn.jconn.setAutoCommit(False)
    cursor = conn.cursor()
    
    # Check if words already imported
    cursor.execute("SELECT COUNT(*) FROM words")
    existing = cursor.fetchone()[0]
    print(f"  Existing words: {existing}")
    if existing > 0:
        cursor.execute("DELETE FROM words")
        conn.commit()
        print("  Cleared existing words data")
    
    # Cache verse_id lookup
    print("\nLoading verse_id cache...")
    cursor.execute("SELECT v.id, v.verse_key FROM verses v JOIN books b ON v.book_id = b.id JOIN translations t ON b.translation_id = t.id WHERE t.code = 'kjv'")
    verse_rows = cursor.fetchall()
    verse_id_map = {}
    for row in verse_rows:
        verse_id_map[row[1].lower()] = row[0]
    print(f"  Cached {len(verse_id_map)} verse keys for KJV")
    
    # Cache book lookup (for source field)
    cursor.execute("SELECT b.id, b.book_id FROM books b JOIN translations t ON b.translation_id = t.id WHERE t.code = 'kjv'")
    book_rows = cursor.fetchall()
    book_id_cache = {row[1].lower(): row[0] for row in book_rows}
    print(f"  Cached {len(book_id_cache)} book IDs for KJV")
    
    # Process OT and NT
    total_words = 0
    total_verses = 0
    missed_verses = 0
    
    for label, path in [('OT', ot_path), ('NT', nt_path)]:
        print(f"\n{'='*40}")
        print(f"Processing KJV {label}...")
        
        if not os.path.exists(path):
            print(f"  ERROR: File not found: {path}")
            continue
        
        data, zlib_offsets = find_zlib_blocks(path)
        
        # Decompress each valid block and extract words
        blocks_processed = 0
        for i, offset in enumerate(zlib_offsets):
            xml_text = decompress_zlib(data, offset)
            if not xml_text or len(xml_text) < 100:
                continue
            # Skip non-OSIS blocks (e.g. header metadata)
            if '<verse' not in xml_text[:5000]:
                continue
            
            blocks_processed += 1
            verses = parse_milestone_verses(xml_text)
            
            # Bulk insert words
            batch = []
            for vdata in verses:
                vkey = vdata['verse_key']
                verse_id = verse_id_map.get(vkey)
                
                if verse_id is None:
                    missed_verses += 1
                    if missed_verses <= 5:
                        print(f"  MISS verse key: {vkey}")
                    continue
                
                total_verses += 1
                for w in vdata['words']:
                    batch.append((verse_id, w['position'], w['text'],
                                  w['strongs'], w['lemma'], w['morphology'],
                                  w['is_parenthetical']))
                    
                    if len(batch) >= BATCH_SIZE:
                        cursor.executemany(
                            "INSERT INTO words (verse_id, position, text, strongs, lemma, morphology, is_parenthetical) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            batch
                        )
                        total_words += len(batch)
                        batch = []
            
            # Remaining batch
            if batch:
                cursor.executemany(
                    "INSERT INTO words (verse_id, position, text, strongs, lemma, morphology, is_parenthetical) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    batch
                )
                total_words += len(batch)
            
            if blocks_processed % 5 == 0:
                conn.commit()
                print(f"  Block {blocks_processed}: {total_words:,} words, {total_verses:,} verses, {missed_verses} missed")
        
        conn.commit()
    
    # Final stats
    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE")
    print(f"  Total words: {total_words:,}")
    print(f"  Total verses with annotations: {total_verses:,}")
    print(f"  Missed verse keys: {missed_verses}")
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM words")
    count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT verse_id) FROM words")
    distinct_verses = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM words WHERE strongs != ''")
    with_strongs = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM words WHERE lemma != ''")
    with_lemma = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM words WHERE morphology != ''")
    with_morph = cursor.fetchone()[0]
    
    print(f"\n  DB verification:")
    print(f"    words table count: {count:,}")
    print(f"    distinct verses: {distinct_verses:,}")
    print(f"    with Strong's: {with_strongs:,}")
    print(f"    with lemma: {with_lemma:,}")
    print(f"    with morphology: {with_morph:,}")
    
    cursor.close()
    conn.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
