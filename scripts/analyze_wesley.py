"""Parse and import Wesley commentary from SWORD zCom format."""
import struct, zlib, re, html, sys, os

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\_tmp_wesley\modules\comments\zcom\wesley"

# Standard book abbreviations
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

WESLEY_BOOK_ID = {
    '01': 'GEN','02': 'EXO','03': 'LEV','04': 'NUM','05': 'DEU',
    '06': 'JOS','07': 'JDG','08': 'RUT','09': '1SA','10': '2SA',
    '11': '1KI','12': '2KI','13': '1CH','14': '2CH','15': 'EZR',
    '16': 'NEH','17': 'EST','18': 'JOB','19': 'PSA','20': 'PRO',
    '21': 'ECC','22': 'SNG','23': 'ISA','24': 'JER','25': 'LAM',
    '26': 'EZK','27': 'DAN','28': 'HOS','29': 'JOL','30': 'AMO',
    '31': 'OBA','32': 'JON','33': 'MIC','34': 'NAM','35': 'HAB',
    '36': 'ZEP','37': 'HAG','38': 'ZEC','39': 'MAL',
    '40': 'MAT','41': 'MRK','42': 'LUK','43': 'JHN','44': 'ACT',
    '45': 'ROM','46': '1CO','47': '2CO','48': 'GAL','49': 'EPH',
    '50': 'PHP','51': 'COL','52': '1TH','53': '2TH','54': '1TI',
    '55': '2TI','56': 'TIT','57': 'PHM','58': 'HEB','59': 'JAS',
    '60': '1PE','61': '2PE','62': '1JO','63': '2JO','64': '3JO',
    '65': 'JUD','66': 'REV',
}

def strip_tags(text):
    """Remove HTML/XML tags, decode entities."""
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'&[a-z]+;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_thml_verses(thml_text, book_id):
    """Parse Wesley's ThML format: <scripRef passage="Gen 1:1">verse text</scripRef>"""
    results = {}
    
    # Try to find the book marker
    # Wesley format uses <scripCom> <scripRef passage="Gen 1:1">text</scripRef>
    chapter = None
    verse = None
    current_text = []
    
    # Pattern 1: <scripRef passage="Book Ch:V">text</scripRef>
    for m in re.finditer(r'<scripRef[^>]*passage="([^"]+)"[^>]*>(.*?)</scripRef>', thml_text, re.DOTALL):
        passage = m.group(1).strip()
        raw_text = m.group(2)
        clean = strip_tags(raw_text)
        
        # Parse "Gen 1:1" format
        pm = re.match(r'(\w+)\s+(\d+):(\d+)', passage)
        if pm:
            bk = pm.group(1)
            ch = int(pm.group(2))
            vs = int(pm.group(3))
            
            # Map book name to ID
            bk_upper = bk[:1].upper() + bk[1:].lower()
            std_bk = OSIS_MAP.get(bk_upper)
            if not std_bk:
                continue
            
            key = (std_bk, ch, vs)
            if key not in results:
                results[key] = []
            results[key].append(clean)
    
    # Pattern 2: <scripCom> <scripRef passage="...">...  (nested)
    if not results:
        for m in re.finditer(r'<scripRef[^>]*passage="([^"]+)"[^>]*>(.*?)</scripRef>', thml_text, re.DOTALL):
            passage = m.group(1).strip()
            text = m.group(2)
            # Recursively extract inner scripRefs
            inner = re.findall(r'<scripRef[^>]*passage="([^"]+)"[^>]*>(.*?)</scripRef>', text, re.DOTALL)
            for inner_pass, inner_text in inner:
                pm = re.match(r'(\w+)\s+(\d+):(\d+)', inner_pass)
                if pm:
                    ch = int(pm.group(2))
                    vs = int(pm.group(3))
                    bk_upper = pm.group(1)[:1].upper() + pm.group(1)[1:].lower()
                    std_bk = OSIS_MAP.get(bk_upper)
                    if std_bk:
                        key = (std_bk, ch, vs)
                        if key not in results:
                            results[key] = []
                        results[key].append(strip_tags(inner_text))
    
    # Pattern 3: Fallback - split on <scripRef and find all verse references
    if not results:
        # Try the passage attribute
        passages = re.findall(r'passage="([^"]+)"', thml_text)
        # Try per-verse extraction
        refs = re.findall(r'<scripRef[^>]*passage="(\w+\s+\d+:\d+)"', thml_text)
        for ref in refs:
            pm = re.match(r'(\w+)\s+(\d+):(\d+)', ref)
            if pm:
                ch = int(pm.group(2))
                vs = int(pm.group(3))
                bk_upper = pm.group(1)[:1].upper() + pm.group(1)[1:].lower()
                std_bk = OSIS_MAP.get(bk_upper)
                if std_bk:
                    key = (std_bk, ch, vs)
                    if key not in results:
                        results[key] = []
    
    return results

def analyze_wesley():
    """Analyze Wesley zCom format."""
    print("=== Wesley Commentary Analysis ===\n")

    for part in ['ot', 'nt']:
        bzs_path = os.path.join(BASE, f'{part}.bzs')
        bzz_path = os.path.join(BASE, f'{part}.bzz')
        bzv_path = os.path.join(BASE, f'{part}.bzv')

        with open(bzz_path, 'rb') as f:
            bzz = f.read()
        with open(bzs_path, 'rb') as f:
            bzs = f.read()
        with open(bzv_path, 'rb') as f:
            bzv = f.read()

        print(f"[{part.upper()}] bzz={len(bzz):,}B, bzs={len(bzs)}B ({len(bzs)//8} entries), bzv={len(bzv)}B")

        # === Step 1: Try full-file zlib decompress with various skip amounts ===
        print(f"\n  Full-file zlib decompress attempts:")
        found_full = False
        for skip in [0, 1, 2, 4, 8, 10, 12, 16, 1110]:
            try:
                text = zlib.decompress(bzz[skip:])
                print(f"    SUCCESS skip={skip}: {len(text):,} chars")
                found_full = True
                # Sample
                print(f"    Preview: {text[:200]}")
                break
            except Exception as e:
                pass

        if not found_full:
            print(f"    All full-file zlib attempts failed")

        # === Step 2: Try per-entry decompress ===
        print(f"\n  Per-entry decompress (bzs):")
        entries = []
        for i in range(len(bzs) // 8):
            v1 = struct.unpack('<I', bzs[i*8:i*8+4])[0]
            v2 = struct.unpack('<I', bzs[i*8+4:i*8+8])[0]
            entries.append((v1, v2))

        # Sort by offset
        entries.sort()
        valid_count = 0
        for i, (off, sz) in enumerate(entries[:10]):
            if sz == 0 or off + sz > len(bzz):
                continue
            chunk = bzz[off:off+sz]
            try:
                text = zlib.decompress(chunk)
                valid_count += 1
                preview = text[:150].decode('utf-8', 'replace').replace('\n', ' ')
                print(f"    [{i}] off={off} sz={sz} -> {len(text)}B: {preview}")
            except:
                pass

        print(f"    Valid entries in first 10: {valid_count}")
        
        # === Step 3: Analyze bzv (verse index) ===
        print(f"\n  BZV verse index analysis:")
        print(f"    Size: {len(bzv)}B, entries: {len(bzv)//8}")

        # bzv entries are likely: [book_id(2B)][chapter(2B)][verse(2B)][offset(2B)?]
        # or: [offset_into_text(4B)][size(4B)]
        sample = []
        for i in range(min(10, len(bzv) // 8)):
            off = i * 8
            vals = struct.unpack('<HHHH', bzv[off:off+8])
            sample.append(vals)
            print(f"    [{i}] {vals}")

        # Check for pattern
        if sample:
            # If first 2 vals are small numbers (< 100), likely book/chapter/verse
            if all(v[0] <= 66 for v in sample) and all(v[1] < 151 for v in sample):
                print(f"    Pattern: looks like (book, chapter, verse, ?)")

        print()

def main():
    analyze_wesley()

if __name__ == '__main__':
    main()
