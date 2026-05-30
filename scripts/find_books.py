"""Understand bzs format: (key, start_offset), block size = next_start - this_start."""
import zlib, struct, os, re

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

for mod, part in [('MHCC','ot')]:
    mod_path = os.path.join(base, mod, 'modules', 'comments', 'zcom', mod.lower())
    bzs_path = os.path.join(mod_path, f'{part}.bzs')
    bzz_path = os.path.join(mod_path, f'{part}.bzz')
    
    with open(bzs_path, 'rb') as f:
        bzs = f.read()
    with open(bzz_path, 'rb') as f:
        bzz = f.read()
    
    entries = []
    for i in range(0, len(bzs), 8):
        key = struct.unpack('<I', bzs[i:i+4])[0]
        offset = struct.unpack('<I', bzs[i+4:i+8])[0]
        entries.append((key, offset))
    
    print(f'{mod} {part}: {len(entries)} entries, bzz={len(bzz):,}B')
    
    # Calculate block sizes
    for i in range(min(10, len(entries))):
        start = entries[i][1]
        end = entries[i+1][1] if i+1 < len(entries) else len(bzz)
        size = end - start
        chunk = bzz[start:end]
        
        try:
            text = zlib.decompress(chunk)
            book_ids = set()
            for bid in re.findall(rb'osisID="(\w+)"', text):
                b = bid.decode()
                if '.' not in b:
                    book_ids.add(b)
            print(f'  [{i}] key={start} size={size:,}B -> zlib OK {len(text):,}B books={book_ids}')
        except Exception as e:
            # Check if starts with zlib header
            has_zlib = chunk[:2] == b'x\x9c' or chunk[:2] == b'\x78\x01'
            snippet = chunk[:20].hex()
            print(f'  [{i}] key={start} size={size:,}B -> zlib FAIL ({str(e)[:40]}) zlib_hdr={has_zlib} hex={snippet}')
    
    # Print all entries with their inferred sizes
    print(f'\nAll entries (first 20):')
    for i in range(min(20, len(entries))):
        start = entries[i][1]
        end = entries[i+1][1] if i+1 < len(entries) else len(bzz)
        size = end - start
        print(f'  [{i}] key={entries[i][0]:10d} offset={start:>10,} size={size:>10,}')