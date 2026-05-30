"""Analyze zCom format for JFB and MHCC commentaries."""
import struct, zlib, os

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

def parse_bzs(path):
    with open(path, 'rb') as f:
        data = f.read()
    entries = []
    for i in range(0, len(data), 8):
        v1 = struct.unpack('<I', data[i:i+4])[0]
        v2 = struct.unpack('<I', data[i+4:i+8])[0]
        entries.append((v1, v2))
    return entries

def parse_bzv(path):
    """Parse verse index (RawVerse4 format) - 20 bytes per entry."""
    with open(path, 'rb') as f:
        data = f.read()
    entries = []
    for i in range(0, len(data), 20):
        testament = struct.unpack('<I', data[i:i+4])[0]
        book = struct.unpack('<I', data[i+4:i+8])[0]
        chapter = struct.unpack('<I', data[i+8:i+12])[0]
        verse = struct.unpack('<I', data[i+12:i+16])[0]
        index = struct.unpack('<I', data[i+16:i+20])[0]
        entries.append((testament, book, chapter, verse, index))
    return entries

def parse_bzv_rawv4(path):
    """RawVerse4 format: per-verse entry with key data."""
    with open(path, 'rb') as f:
        data = f.read()
    
    entries = []
    for i in range(0, len(data), 24):
        if i + 24 > len(data):
            break
        offset = struct.unpack('<I', data[i:i+4])[0]       # byte offset in decompressed text
        size = struct.unpack('<I', data[i+4:i+8])[0]        # size in bytes
        testament = struct.unpack('<I', data[i+8:i+12])[0]  # 1=OT, 2=NT
        book = struct.unpack('<I', data[i+12:i+16])[0]     # book number
        chapter = struct.unpack('<I', data[i+16:i+20])[0]  # chapter
        verse = struct.unpack('<I', data[i+20:i+24])[0]    # verse
        entries.append((offset, size, testament, book, chapter, verse))
    return entries

for module, part in [('JFB', 'nt'), ('JFB', 'ot'), ('MHCC', 'nt'), ('MHCC', 'ot')]:
    mod_path = os.path.join(base, module, 'modules', 'comments', 'zcom', module.lower())
    bzs_path = f'{mod_path}/{part}.bzs'
    bzz_path = f'{mod_path}/{part}.bzz'
    bzv_path = f'{mod_path}/{part}.bzv'
    
    if not os.path.exists(bzs_path):
        print(f'\n{module}/{part}: no bzs file')
        continue
    
    bzs = parse_bzs(bzs_path)
    bzv = parse_bzv(bzv_path)
    
    print(f'\n===== {module} {part} =====')
    print(f'bzs entries: {len(bzs)}')
    print(f'bzv entries: {len(bzv)}')
    print(f'First 3 bzs: {bzs[:3]}')
    print(f'First 3 bzv: {bzv[:3]}')
    
    # Check bzv content
    non_zero = [(i, e) for i, e in enumerate(bzv) if e[0] != 0 or e[1] != 0 or e[2] != 0 or e[3] != 0]
    print(f'Non-zero bzv entries: {len(non_zero)}')
    if non_zero:
        print(f'  First 3: {non_zero[:3]}')
    
    # Now decompress blocks
    with open(bzz_path, 'rb') as f:
        bzz_data = f.read()
    
    # Try sequential decompression
    pos = 0
    total_decomp = 0
    for i, (v1, v2) in enumerate(bzs):
        chunk = bzz_data[pos:pos+v2]
        try:
            text = zlib.decompress(chunk)
            total_decomp += len(text)
        except:
            pass
        pos += v2
    
    print(f'  Total compressed: {len(bzz_data)}, Total decompressed: {total_decomp}')
    print(f'  bzs entry count: {len(bzs)}')
    
    # Check bzv rawv4
    bzv_rv4 = parse_bzv_rawv4(bzv_path)
    print(f'  bzv rawv4 entries: {len(bzv_rv4)}')
    if bzv_rv4:
        print(f'  First 3: {bzv_rv4[:3]}')
