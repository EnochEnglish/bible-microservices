"""Fix: bzs entries are absolute positions in .bzz file."""
import struct, zlib, os, re
from html.parser import HTMLParser

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

ABBREV_TO_OSIS = {
    'Ge':'GEN','Ex':'EXO','Le':'LEV','Nu':'NUM','De':'DEU',
    'Jos':'JOS','Jdg':'JDG','Ru':'RUT','1Sa':'1SA','2Sa':'2SA',
    '1Ki':'1KI','2Ki':'2KI','1Ch':'1CH','2Ch':'2CH',
    'Ezr':'EZR','Ne':'NEH','Es':'EST','Job':'JOB',
    'Ps':'PSA','Pr':'PRO','Ec':'ECC','So':'SNG',
    'Isa':'ISA','Jer':'JER','La':'LAM','Eze':'EZK',
    'Da':'DAN','Ho':'HOS','Joe':'JOL','Am':'AMO',
    'Ob':'OBA','Jon':'JON','Mic':'MIC','Na':'NAM',
    'Hab':'HAB','Zep':'ZEP','Hag':'HAG','Zec':'ZEC','Mal':'MAL',
    'Mt':'MAT','Mr':'MRK','Lu':'LUK','Joh':'JHN',
    'Ac':'ACT','Ro':'ROM','1Co':'1CO','2Co':'2CO',
    'Ga':'GAL','Eph':'EPH','Php':'PHP','Col':'COL',
    '1Th':'1TH','2Th':'2TH','1Ti':'1TI','2Ti':'2TI',
    'Tit':'TIT','Phm':'PHM','Heb':'HEB','Jas':'JAS',
    '1Pe':'1PE','2Pe':'2PE','1Jo':'1JO','2Jo':'2JO',
    '3Jo':'3JO','Jud':'JUD','Re':'REV',
}

sw_ot_books = ['','Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki',
    '1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro','Ecc','Sng',
    'Isa','Jer','Lam','Ezk','Dan','Hos','Joe','Amo','Oba','Jon','Mic',
    'Nam','Hab','Zep','Hag','Zec','Mal']
sw_nt_books = ['','Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col',
    '1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev']

class OSISStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, data):
        self.text.append(data)
    def get_text(self):
        return ''.join(self.text)

def decode_sky(sky):
    verse = sky & 0xFF
    chapter = (sky >> 8) & 0xFF
    book = (sky >> 16) & 0xFF
    testament = (sky >> 24) & 0xFF
    return testament, book, chapter, verse

# Test JFB NT first with correct bzz offsets
mod = 'JFB'
mod_path = os.path.join(base, mod, 'modules', 'comments', 'zcom', mod.lower())

for part in ['nt', 'ot']:
    bzs_path = os.path.join(mod_path, f'{part}.bzs')
    bzz_path = os.path.join(mod_path, f'{part}.bzz')
    bzv_path = os.path.join(mod_path, f'{part}.bzv')
    
    with open(bzs_path, 'rb') as f:
        bzs_data = f.read()
    with open(bzz_path, 'rb') as f:
        bzz_data = f.read()
    
    bzv_size = os.path.getsize(bzv_path)
    rec_size = 12 if bzv_size % 12 == 0 else 10
    
    # Parse bzv
    with open(bzv_path, 'rb') as f:
        bzv_data = f.read()
    bzv_entries = []
    for i in range(0, len(bzv_data), rec_size):
        if rec_size == 12:
            sky = struct.unpack('<I', bzv_data[i:i+4])[0]
            offset = struct.unpack('<I', bzv_data[i+4:i+8])[0]
            size = struct.unpack('<I', bzv_data[i+8:i+12])[0]
        else:
            sky = struct.unpack('<I', bzv_data[i:i+4])[0]
            offset = struct.unpack('<I', bzv_data[i+4:i+8])[0]
            size = struct.unpack('<H', bzv_data[i+8:i+10])[0]
        t, b, c, v = decode_sky(sky)
        bzv_entries.append({'sky':sky, 'offset':offset, 'size':size, 't':t, 'b':b, 'c':c, 'v':v})
    
    print(f"\n===== {mod} {part} =====")
    print(f"bzv entries: {len(bzv_entries)}, bzs entries: {len(bzs_data)//8}")
    print(f"bzz size: {len(bzz_data)}")
    
    # Parse bzs as absolute positions in bzz
    bzs_blocks = []
    for i in range(0, len(bzs_data), 8):
        v1 = struct.unpack('<I', bzs_data[i:i+4])[0]  # offset in bzz
        v2 = struct.unpack('<I', bzs_data[i+4:i+8])[0]  # compressed size
        bzs_blocks.append((v1, v2))
    
    # Decompress using absolute bzz positions
    decompressed_blocks = []
    for bzz_offset, comp_size in bzs_blocks:
        if bzz_offset + comp_size > len(bzz_data):
            print(f"  BAD: offset={bzz_offset} size={comp_size} exceeds {len(bzz_data)}")
            continue
        chunk = bzz_data[bzz_offset:bzz_offset+comp_size]
        try:
            text = zlib.decompress(chunk)
            decompressed_blocks.append((bzz_offset, text))
            if len(decompressed_blocks) <= 3:
                print(f"  Block at bzz[{bzz_offset}:{bzz_offset+comp_size}] -> {len(text)}B decomp: {text[:80]}")
        except Exception as e:
            if len(decompressed_blocks) < 3:
                print(f"  FAIL at bzz[{bzz_offset}]: {e}")
    
    print(f"  Decompressed blocks: {len(decompressed_blocks)}/{len(bzs_blocks)}")
    
    # Now map bzv entries to decompressed blocks
    # We need to figure out the mapping between bzv offset and which block it's in
    # For now, guess: bzv offset refers to position within concatenated decompressed blocks
    
    # Each block in bzs corresponds to a book? bzs has 60 OT entries (but OT has 39 books)
    # So 60 != 39. Let's just try to decompress and look at results.
    
    # Let's show the first 10 bzv entries with non-zero size
    non_zero_bzv = [e for e in bzv_entries if e['size'] > 0][:10]
    print(f"\n  First 10 non-zero bzv entries:")
    for e in non_zero_bzv:
        bname = (sw_nt_books if e['t']==2 else sw_ot_books)[e['b']] if e['b'] < len(sw_ot_books) else f"B{e['b']}"
        print(f"    T={e['t']} {bname} {e['c']}:{e['v']} off={e['offset']} sz={e['size']}")
    
    break  # Just do one part for now to validate