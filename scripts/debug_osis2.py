"""Try different decompression methods for bzs blocks."""
import struct, zlib, os

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

for mod in ['MHCC', 'JFB']:
    mod_path = os.path.join(base, mod, 'modules', 'comments', 'zcom', mod.lower())
    
    for part in ['ot', 'nt']:
        bzs_path = os.path.join(mod_path, f'{part}.bzs')
        bzz_path = os.path.join(mod_path, f'{part}.bzz')
        
        if not os.path.exists(bzs_path):
            continue
            
        with open(bzs_path, 'rb') as f:
            bzs_data = f.read()
        with open(bzz_path, 'rb') as f:
            bzz_data = f.read()
        
        entries = []
        for i in range(0, len(bzs_data), 8):
            v1 = struct.unpack('<I', bzs_data[i:i+4])[0]
            v2 = struct.unpack('<I', bzs_data[i+4:i+8])[0]
            entries.append((v1, v2))
        
        print(f'\n===== {mod} {part} ({len(entries)} entries, bzz={len(bzz_data)}) =====')
        
        # Method 1: Sequential, each block with fresh zlib decompressor
        pos = 0
        ok_seq = 0
        texts = []
        for i, (v1, v2) in enumerate(entries):
            if pos + v2 > len(bzz_data):
                break
            chunk = bzz_data[pos:pos+v2]
            try:
                dobj = zlib.decompressobj()
                t = dobj.decompress(chunk)
                t += dobj.flush()
                texts.append((i, t))
                ok_seq += 1
            except:
                pass
            pos += v2
        print(f'  Sequential zlib: {ok_seq}/{len(entries)}')
        
        # Method 2: Absolute bzz positions
        ok_abs = 0
        abs_texts = []
        for i, (v1, v2) in enumerate(entries[:20]):
            if v1 + v2 > len(bzz_data):
                continue
            chunk = bzz_data[v1:v1+v2]
            try:
                dobj = zlib.decompressobj()
                t = dobj.decompress(chunk)
                t += dobj.flush()
                abs_texts.append((i, t))
                ok_abs += 1
            except:
                pass
        print(f'  Absolute zlib (first 20): {ok_abs}')
        
        # Method 3: Raw deflate (no zlib header)
        pos = 0
        ok_raw = 0
        for i, (v1, v2) in enumerate(entries[:20]):
            if pos + v2 > len(bzz_data):
                break
            chunk = bzz_data[pos:pos+v2]
            try:
                t = zlib.decompress(chunk, -15)
                ok_raw += 1
                if ok_raw <= 2:
                    print(f'    [{i}] raw deflate OK: {len(t)}B')
                    print(f'      {t[:100]}')
            except:
                pass
            pos += v2
        print(f'  Sequential raw deflate: {ok_raw}')
        
        # Method 4: Absolute with raw deflate
        ok_abs_raw = 0
        for i, (v1, v2) in enumerate(entries[:20]):
            if v1 + v2 > len(bzz_data):
                continue
            chunk = bzz_data[v1:v1+v2]
            try:
                t = zlib.decompress(chunk, -15)
                ok_abs_raw += 1
            except:
                pass
        print(f'  Absolute raw deflate (first 20): {ok_abs_raw}')
        
        # Show what successful absolute decompressions give
        for i, t in abs_texts[:3]:
            print(f'    abs[{i}]: {len(t)}B => {t.decode("utf-8","replace")[:120]}')