"""
Import cross-references from CrossReferences.org TSK-derived dataset.
Source: CrossReferences-org/bible-cross-references (CC BY-SA 4.0)
Format: TSV - book\tchapter\tverse\tanchor\treferences
"""
import os, sys, re, json
from urllib.request import Request, urlopen

TSV_PATH = os.path.join(os.path.dirname(__file__), 'commentary_data', 'crossrefs_kjv.tsv')
API_BASE = "http://localhost:8081"
BATCH_SIZE = 1000

# KJV abbreviation → OSIS book ID
KJV_TO_OSIS = {
    'Gen': 'GEN', 'Exod': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deut': 'DEU',
    'Josh': 'JOS', 'Judg': 'JDG', 'Ruth': 'RUT',
    '1 Sam': '1SA', '2 Sam': '2SA', '1 Kgs': '1KI', '2 Kgs': '2KI',
    '1 Chr': '1CH', '2 Chr': '2CH', 'Ezra': 'EZR', 'Neh': 'NEH', 'Esth': 'EST',
    'Job': 'JOB', 'Ps': 'PSA', 'Prov': 'PRO', 'Eccl': 'ECC', 'Song': 'SNG',
    'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM', 'Ezek': 'EZK', 'Dan': 'DAN',
    'Hos': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obad': 'OBA',
    'Jonah': 'JON', 'Mic': 'MIC', 'Nah': 'NAM', 'Hab': 'HAB',
    'Zeph': 'ZEP', 'Hag': 'HAG', 'Zech': 'ZEC', 'Mal': 'MAL',
    'Matt': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
    'Acts': 'ACT', 'Rom': 'ROM',
    '1 Cor': '1CO', '2 Cor': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
    'Phil': 'PHP', 'Col': 'COL',
    '1 Thess': '1TH', '2 Thess': '2TH',
    '1 Tim': '1TI', '2 Tim': '2TI', 'Titus': 'TIT', 'Phlm': 'PHM',
    'Heb': 'HEB', 'Jas': 'JAS',
    '1 Pet': '1PE', '2 Pet': '2PE',
    '1 John': '1JO', '2 John': '2JO', '3 John': '3JO',
    'Jude': 'JUD', 'Rev': 'REV',
}

def parse_ref(ref_str):
    """Parse 'Prov 8:22-24' → ('PRO', 8, '22-24')"""
    m = re.match(r'(\d?\s?\w[\w\s]*?)\s+(\d+):([\d,\-]+(?:\s(?:and|ff))?.?)$', ref_str.strip())
    if not m:
        return None
    book_name, ch, vs = m.groups()
    osis = KJV_TO_OSIS.get(book_name.strip())
    if not osis:
        return None
    return (osis, int(ch), vs.strip())


def main():
    print(f"Reading TSV: {TSV_PATH}")
    if not os.path.exists(TSV_PATH):
        print(f"ERROR: {TSV_PATH} not found")
        return
    
    lines = open(TSV_PATH, encoding='utf-8').read().strip().split('\n')
    header = lines[0].split('\t')
    print(f"Header: {header}")
    print(f"Data rows: {len(lines) - 1}")
    
    # Group by (book, chapter, verse) → combine all references with anchors
    verse_data = {}  # (bookId, chapter, verse) → [(anchor, [refs])]
    unmapped_books = set()
    
    for line in lines[1:]:
        parts = line.split('\t')
        if len(parts) < 5:
            continue
        book_abbr, chapter, verse, anchor, references = parts[0], parts[1], parts[2], parts[3], parts[4]
        
        book_id = KJV_TO_OSIS.get(book_abbr)
        if not book_id:
            unmapped_books.add(book_abbr)
            continue
        
        key = (book_id, int(chapter), int(verse))
        if key not in verse_data:
            verse_data[key] = []
        
        # Parse references
        refs = []
        for ref_str in references.split('|'):
            parsed = parse_ref(ref_str)
            if parsed:
                refs.append(f"{parsed[0]} {parsed[1]}:{parsed[2]}")
        
        verse_data[key].append((anchor, refs))
    
    if unmapped_books:
        print(f"WARNING: Unmapped books: {unmapped_books}")
    
    print(f"Unique verses with cross-refs: {len(verse_data)}")
    
    # Build commentary records
    commentaries = []
    for (book_id, chapter, verse), entries in verse_data.items():
        # Format: "anchor1: ref1, ref2; anchor2: ref3, ref4"
        parts = []
        for anchor, refs in entries:
            parts.append(f"{anchor}: {'; '.join(refs)}")
        text = "\n".join(parts)
        commentaries.append({
            "source": "TSK",
            "sourceName": "Treasury of Scripture Knowledge",
            "bookId": book_id,
            "chapter": chapter,
            "verseStart": verse,
            "verseEnd": verse,
            "text": text
        })
    
    print(f"Total commentary records: {len(commentaries)}")
    
    # Save to JSON
    json_path = TSV_PATH.replace('.tsv', '_parsed.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(commentaries, f, ensure_ascii=False, indent=2)
    print(f"Saved JSON: {json_path}")
    
    # Import via API
    print(f"\nImporting to {API_BASE}...")
    imported = 0
    failed = 0
    for i in range(0, len(commentaries), BATCH_SIZE):
        batch = commentaries[i:i + BATCH_SIZE]
        payload = {
            "source": "TSK",
            "sourceName": "Treasury of Scripture Knowledge",
            "commentaries": [
                {k: v for k, v in c.items() if k not in ('source', 'sourceName')}
                for c in batch
            ]
        }
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        try:
            req = Request(
                f"{API_BASE}/api/v1/annotations/import-commentary",
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            resp = urlopen(req, timeout=120)
            result = json.loads(resp.read().decode('utf-8'))
            imported += result.get('imported', 0)
            if (i // BATCH_SIZE + 1) % 20 == 0:
                print(f"  Batch {i // BATCH_SIZE + 1}: imported={imported}, skipped={result.get('skipped', 0)}")
        except Exception as e:
            print(f"  Batch {i // BATCH_SIZE + 1} FAILED: {e}")
            failed += len(batch)
    
    print(f"\nDone! Imported={imported}, Failed={failed}")


if __name__ == '__main__':
    main()
