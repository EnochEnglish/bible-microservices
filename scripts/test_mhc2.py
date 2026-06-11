import struct, zlib, os

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

def parse_sword_zcom(name, moddir, part):
    """Parse SWORD zCom format with CompressType=ZIP, BlockType=BOOK"""
    base = os.path.join(dl, name, 'modules', 'comments', moddir, name.lower())
    bzs = open(f'{base}/{part}.bzs', 'rb').read()
    bzz = open(f'{base}/{part}.bzz', 'rb').read()
    
    # .bzs: per-book (decompressed_offset:uint32, compressed_size:uint32)
    entries = []
    for i in range(0, len(bzs), 8):
        doff, csize = struct.unpack('<II', bzs[i:i+8])
        if csize > 0:
            entries.append((doff, csize))
    
    print(f"{name} {part}: {len(entries)} books, .bzz={len(bzz)} bytes")
    
    # Decompress block by block from .bzz, tracking compressed position
    cpos = 0
    book_texts = []
    for bi, (doff, csize) in enumerate(entries):
        if cpos + csize > len(bzz):
            print(f"  Book {bi}: cpos={cpos}+csize={csize} > {len(bzz)} - truncating")
            csize = len(bzz) - cpos
        chunk = bzz[cpos:cpos+csize]
        try:
            txt = zlib.decompress(chunk).decode('utf-8', errors='replace')
            book_texts.append(txt)
            if bi < 3 or bi >= len(entries) - 2:
                print(f"  Book {bi}: doff={doff} csize={csize} -> {len(txt)} chars")
                print(f"    {txt[:120]}")
        except Exception as e:
            print(f"  Book {bi}: FAIL cpos={cpos} csize={csize}: {e}")
            book_texts.append('')
        cpos += csize
    
    combined = ''.join(book_texts)
    print(f"  Total: {len(combined)} chars")
    return combined

# Parse all modules
for name, moddir, parts in [
    ('MHC', 'zcom4', ['ot', 'nt']),
    ('TSK', 'zcom', ['ot', 'nt']),
    ('MHCC', 'zcom4', ['ot', 'nt']),
    ('JFB', 'zcom4', ['ot', 'nt'])
]:
    try:
        for part in parts:
            parse_sword_zcom(name, moddir, part)
    except Exception as e:
        print(f"{name}: {e}")