"""Import Matthew Henry Complete Commentary (MHC) from SWORD zCom4 module."""
import struct, zlib, re, json, sys, html
from urllib.request import Request, urlopen

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\modules\comments\zcom4\mhc"
API = "http://localhost:8081"

OSIS_MAP = {
    'Exod':'EXO','Num':'NUM','Josh':'JOS','Ruth':'RUT',
    '2Sam':'2SA','2Kgs':'2KI','2Chr':'2CH','Neh':'NEH',
    'Job':'JOB','Prov':'PRO','Song':'SNG',
    'Jer':'JER','Ezek':'EZK','Hos':'HOS','Amos':'AMO',
    'Jonah':'JON','Nah':'NAM','Zeph':'ZEP','Zech':'ZEC',
    'Mark':'MRK','John':'JHN','Rom':'ROM',
    '2Cor':'2CO','Eph':'EPH','Col':'COL',
    '2Thess':'2TH','2Tim':'2TI','Phlm':'PHM',
    'Jas':'JAS','2Pet':'2PE','2John':'2JO','Jude':'JUD',
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
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|nbsp;|copy;|reg;|trade;)[a-z]+;', ' ', text)
    text = re.sub(r'\xa0', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'&(amp|lt|gt|quot|apos|nbsp|copy|reg);', 
                  lambda m: {'amp':'&','lt':'<','gt':'>','quot':'"','apos':"'",
                             'nbsp':' ','copy':'\u00a9','reg':'\u00ae'}[m.group(1)], text)
    return text.strip()

def parse_mhc_chapters(osistext):
    book_m = re.search(r'<div\s+canonical="true"\s+osisID="([^"]+)"', osistext)
    if not book_m:
        return []
    osis_id = book_m.group(1)
    std_id = OSIS_MAP.get(osis_id)
    if not std_id:
        print(f'  WARN: unknown OSIS "{osis_id}", skipping')
        return []
    
    max_ch = BOOK_CHAPTERS.get(std_id, 50)
    
    # Find chapter start markers
    chap_pattern = rf'<chapter\s+n="(\d+)"\s+osisID="{re.escape(osis_id)}\.(\d+)"\s+sID="[^"]*"\s*/>'
    chapters = list(re.finditer(chap_pattern, osistext))
    
    if not chapters:
        # Try alternative pattern
        pattern2 = rf'<chapter\s+n="(\d+)"\s+osisID="([^"]+)"\s+sID="([^"]*)"\s*/>'
        chapters = list(re.finditer(pattern2, osistext))
        chapters = [ch for ch in chapters if ch.group(2).startswith(f'{osis_id}.')]
    
    results = []
    for i, ch in enumerate(chapters):
        ch_num = int(ch.group(1))
        # Find chapter ending
        end_pattern = f'<chapter eID="{osis_id}.{ch_num}"'
        end_pos = osistext.find(end_pattern, ch.end())
        if end_pos == -1:
            if i + 1 < len(chapters):
                end_pos = chapters[i+1].start()
            else:
                end_pos = len(osistext)
        
        raw = osistext[ch.end():end_pos]
        clean = strip_tags(raw)
        
        if len(clean) > 50:
            results.append({
                'bookId': std_id,
                'chapter': ch_num,
                'verseStart': 1,
                'verseEnd': max_ch,
                'text': clean[:20000]
            })
    
    return results

def import_via_api(commentaries, source, source_name, batch_size=200):
    total = len(commentaries)
    print(f'\nImporting {total} records via API (batch={batch_size})...')
    
    for i in range(0, total, batch_size):
        batch = commentaries[i:i+batch_size]
        payload = json.dumps({
            'source': source,
            'sourceName': source_name,
            'commentaries': batch
        }, ensure_ascii=False).encode('utf-8')
        
        try:
            req = Request(f'{API}/api/v1/annotations/import-commentary',
                         data=payload,
                         headers={'Content-Type': 'application/json'},
                         method='POST')
            resp = urlopen(req, timeout=120)
            end_idx = min(i+batch_size, total)
            result = resp.read().decode()[:200]
            print(f'  [{i+1}-{end_idx}/{total}] OK ({result})')
        except Exception as e:
            error_body = ''
            if hasattr(e, 'read'):
                try: error_body = e.read().decode()[:300]
                except: pass
            print(f'  FAILED [{i+1}]: {e}')
            if error_body: print(f'    Response: {error_body}')
            return False
    return True

def main():
    all_commentaries = []
    
    for section in ['ot', 'nt']:
        with open(f'{BASE}\\{section}.bzs', 'rb') as f:
            data = f.read()
        entries = [(struct.unpack_from("<II", data, i)) for i in range(0, len(data), 8)]
        valid_idx = list(range(0, len(entries), 3))
        
        with open(f'{BASE}\\{section}.bzz', 'rb') as f:
            bzz = f.read()
        
        print(f'\n=== {section.upper()} ({len(valid_idx)} blocks) ===')
        for blk_idx, ent_idx in enumerate(valid_idx):
            off, sz = entries[ent_idx]
            try:
                text = zlib.decompress(bzz[off:off+sz]).decode("utf-8", errors="replace")
            except Exception as e:
                print(f'  Block {blk_idx}: DECOMPRESS FAILED ({e})')
                continue
            
            if len(text) < 200:
                continue  # Skip milestones
            
            chapters = parse_mhc_chapters(text)
            if chapters:
                book = chapters[0]['bookId']
                chars = sum(len(c['text']) for c in chapters)
                print(f'  Block {blk_idx}: {book} ({len(chapters)}ch, {chars:,} chars)')
                all_commentaries.extend(chapters)
    
    print(f'\n=== SUMMARY ===')
    print(f'Total: {len(all_commentaries)} chapters')
    books = sorted(set(c['bookId'] for c in all_commentaries))
    print(f'Books: {", ".join(books)}')
    
    if not all_commentaries:
        print("No data extracted!")
        return
    
    ok = import_via_api(all_commentaries, 'MHC', 'Matthew Henry Complete Commentary')
    if ok:
        print('\nMHC import COMPLETE!')
    else:
        print('\nMHC import FAILED!')

if __name__ == '__main__':
    main()