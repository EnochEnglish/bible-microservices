"""Import SWORD zCom commentaries: Genesis (full-decompress) + per-book zlib blocks."""
import zlib, struct, os, re, json, html, sys
from urllib.request import Request, urlopen

API_BASE = "http://localhost:8081"
base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

OSIS_MAP = {
    'Gen':'GEN','Exod':'EXO','Lev':'LEV','Num':'NUM','Deut':'DEU',
    'Josh':'JOS','Judg':'JDG','Ruth':'RUT','1Sam':'1SA','2Sam':'2SA',
    '1Kgs':'1KI','2Kgs':'2KI','1Chr':'1CH','2Chr':'2CH','Ezra':'EZR',
    'Neh':'NEH','Esth':'EST','Job':'JOB','Ps':'PSA','Prov':'PRO',
    'Eccl':'ECC','Song':'SNG','Isa':'ISA','Jer':'JER','Lam':'LAM',
    'Ezek':'EZK','Dan':'DAN','Hos':'HOS','Joel':'JOL','Amos':'AMO',
    'Obad':'OBA','Jonah':'JON','Mic':'MIC','Nah':'NAM','Hab':'HAB',
    'Zeph':'ZEP','Hag':'HAG','Zech':'ZEC','Mal':'MAL',
    'Matt':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT',
    'Rom':'ROM','1Cor':'1CO','2Cor':'2CO','Gal':'GAL','Eph':'EPH',
    'Phil':'PHP','Col':'COL','1Thess':'1TH','2Thess':'2TH',
    '1Tim':'1TI','2Tim':'2TI','Titus':'TIT','Phlm':'PHM','Heb':'HEB',
    'Jas':'JAS','1Pet':'1PE','2Pet':'2PE','1John':'1JO','2John':'2JO',
    '3John':'3JO','Jude':'JUD','Rev':'REV',
}

BOOK_CHAPTERS = {
    'GEN':50,'EXO':40,'LEV':27,'NUM':36,'DEU':34,'JOS':24,'JDG':21,'RUT':4,
    '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,'EZR':10,'NEH':13,
    'EST':10,'JOB':42,'PSA':150,'PRO':31,'ECC':12,'SNG':8,'ISA':66,'JER':52,
    'LAM':5,'EZK':48,'DAN':12,'HOS':14,'JOL':3,'AMO':9,'OBA':1,'JON':4,'MIC':7,
    'NAM':3,'HAB':3,'ZEP':3,'HAG':2,'ZEC':14,'MAL':4,
    'MAT':28,'MRK':16,'LUK':24,'JHN':21,'ACT':28,'ROM':16,'1CO':16,'2CO':13,
    'GAL':6,'EPH':6,'PHP':4,'COL':4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
    'TIT':3,'PHM':1,'HEB':13,'JAS':5,'1PE':5,'2PE':3,'1JO':5,'2JO':1,
    '3JO':1,'JUD':1,'REV':22,
}

def strip_tags(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_mhcc_chapters(text):
    """Parse MHCC OSIS text to per-chapter commentaries."""
    results = []
    current_book = 'GEN'
    
    # Find book marker (canonical div)
    book_m = re.search(r'<div\s+canonical="true"\s+osisID="(\w+)"', text)
    if book_m:
        current_book = OSIS_MAP.get(book_m.group(1), book_m.group(1).upper())
    
    # Find all chapters
    chapters = list(re.finditer(
        r'<chapter\s+n="(\d+)"\s+osisID="(\w+)\.(\d+)"\s+sID="[^"]*"\s*/>', text
    ))
    
    if not chapters:
        # Try broader pattern
        chapters = list(re.finditer(r'<chapter\s+n="(\d+)"\s+osisID="([^"]+)"\s+sID="([^"]*)"\s*/>', text))
    
    for i, ch in enumerate(chapters):
        ch_num = int(ch.group(1))
        osis_id = ch.group(2)
        book_name = osis_id.split('.')[0]
        book_id = OSIS_MAP.get(book_name, book_name.upper())
        
        # End position
        end_pos = text.find(f'<chapter eID="{osis_id}"', ch.end())
        if end_pos < 0:
            if i + 1 < len(chapters):
                end_pos = chapters[i+1].start()
            else:
                end_pos = len(text)
        
        raw = text[ch.end():end_pos]
        clean = strip_tags(raw)
        
        if len(clean) > 50:
            max_v = BOOK_CHAPTERS.get(book_id, 50)
            results.append({
                'bookId': book_id,
                'chapter': ch_num,
                'verseStart': 1,
                'verseEnd': max_v,
                'text': clean[:10000]  # Cap at 10K chars
            })
    
    return results

def get_all_books(mod_name):
    """Extract all books using: Genesis = full-decompress, rest = per-block zlib."""
    mod_path = os.path.join(base, mod_name, 'modules', 'comments', 'zcom', mod_name.lower())
    all_commentaries = []
    
    for part in ['ot', 'nt']:
        bzs_path = os.path.join(mod_path, f'{part}.bzs')
        bzz_path = os.path.join(mod_path, f'{part}.bzz')
        if not os.path.exists(bzz_path):
            continue
        
        with open(bzz_path, 'rb') as f:
            bzz = f.read()
        with open(bzs_path, 'rb') as f:
            bzs = f.read()
        
        entries = []
        for i in range(0, len(bzs), 8):
            v1 = struct.unpack('<I', bzs[i:i+4])[0]
            v2 = struct.unpack('<I', bzs[i+4:i+8])[0]
            entries.append((v1, v2))
        
        print(f'\n  {part}: {len(entries)} bzs entries, bzz={len(bzz):,}B')
        
        # 1) Genesis (or Matthew for NT) from full decompress
        try:
            gen_text = zlib.decompress(bzz[1110:]).decode('utf-8', 'replace')
            chapters = parse_mhcc_chapters(gen_text)
            all_commentaries.extend(chapters)
            book_ids = set(c['bookId'] for c in chapters)
            print(f'    Full-block: {len(chapters)} chapters, books={book_ids}')
        except Exception as e:
            print(f'    Full-block FAIL: {e}')
        
        # 2) Per-book zlib blocks
        for idx, (v1, v2) in enumerate(entries):
            if v2 == 0 or v1 + v2 > len(bzz):
                continue
            chunk = bzz[v1:v1+v2]
            try:
                text = zlib.decompress(chunk)
                if len(text) < 1000:
                    continue  # Skip header/small blocks
                
                text_str = text.decode('utf-8', 'replace')
                chapters = parse_mhcc_chapters(text_str)
                if chapters:
                    all_commentaries.extend(chapters)
                    book_ids = set(c['bookId'] for c in chapters)
                    print(f'    [{idx}] pos={v1} size={v2} -> {len(chapters)}ch {book_ids}')
            except:
                pass
    
    return all_commentaries

def import_via_api(commentaries, source, source_name, batch_size=200):
    total = len(commentaries)
    print(f'\nImporting {total} records (batch={batch_size})...')
    
    for i in range(0, total, batch_size):
        batch = commentaries[i:i+batch_size]
        payload = json.dumps({
            'source': source,
            'sourceName': source_name,
            'commentaries': batch
        }, ensure_ascii=False).encode('utf-8')
        
        try:
            req = Request(
                f'{API_BASE}/api/v1/annotations/import-commentary',
                data=payload,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            resp = urlopen(req, timeout=120)
            end_idx = min(i+batch_size, total)
            print(f'  [{i+1}-{end_idx}/{total}] OK ({resp.read().decode()[:100]})')
        except Exception as e:
            print(f'  Batch [{i+1}] FAILED: {e}')
            return False
    return True

if __name__ == '__main__':
    module = sys.argv[1] if len(sys.argv) > 1 else 'MHCC'
    
    if module == 'MHCC':
        print('=== MHCC (Matthew Henry Concise) ===')
        commentaries = get_all_books('MHCC')
        source_name = "Matthew Henry's Concise Commentary"
        
    elif module == 'JFB':
        print('=== JFB (Jamieson-Fausset-Brown) ===')
        commentaries = get_all_books('JFB')
        source_name = 'Jamieson Fausset Brown Commentary'
    
    else:
        print(f'Unknown module: {module}')
        sys.exit(1)
    
    print(f'\nTotal commentaries: {len(commentaries)}')
    # Show samples
    for c in sorted(commentaries, key=lambda x: (x['bookId'], x['chapter']))[:3]:
        print(f'  {c["bookId"]} Ch{c["chapter"]}: {c["text"][:120]}...')
    
    if len(sys.argv) > 2 and sys.argv[2] == '--import':
        import_via_api(commentaries, module, source_name)