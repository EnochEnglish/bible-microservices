"""Check failed entries for raw text content - maybe some are uncompressed."""
import zlib, struct, os, re

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

mod_path = os.path.join(base, 'MHCC', 'modules', 'comments', 'zcom', 'mhcc')
with open(mod_path + '\\ot.bzs', 'rb') as f:
    bzs = f.read()
with open(mod_path + '\\ot.bzz', 'rb') as f:
    bzz = f.read()

entries = []
for i in range(0, len(bzs), 8):
    v1 = struct.unpack('<I', bzs[i:i+4])[0]
    v2 = struct.unpack('<I', bzs[i+4:i+8])[0]
    entries.append((v1, v2))

# Try raw text in each entry
books_expected = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth',
                  '1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh',
                  'Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer',
                  'Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah',
                  'Mic','Nah','Hab','Zeph','Hag','Zech','Mal']

for i, (v1, v2) in enumerate(entries):
    if v1 + v2 > len(bzz):
        continue
    chunk = bzz[v1:v1+v2]
    
    # Try zlib first
    try:
        text = zlib.decompress(chunk)
        ids = re.findall(rb'osisID="(\w+)"', text)
        books = set(b.decode() for b in ids if b'.' not in b)
        if books:
            continue  # Already handled
    except:
        pass
    
    # Try raw text detection
    text = chunk.decode('utf-8','replace')
    if 'osisID' in text or 'chapter' in text or '<div' in text:
        print(f'  [{i}] v1={v1} v2={v2} -> RAW TEXT FOUND!')
        print(f'    First 200: {text[:200]}')
    
    # Check for book identifiers
    for book in books_expected:
        if book.encode() in chunk:
            # This chunk contains a book reference
            text_sample = chunk[:200].decode('utf-8','replace')
            if 'osisID' in text_sample or '<chapter' in text_sample:
                print(f'  [{i}] v1={v1} v2={v2} -> Contains {book} (text/osis found)')
                print(f'    {text_sample[:150]}')
                break