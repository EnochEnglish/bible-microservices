import struct, zlib, os

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'
base = os.path.join(dl, 'TSK', 'modules', 'comments', 'zcom', 'tsk')

for part in ['ot', 'nt']:
    bzs = open(f'{base}/{part}.bzs', 'rb').read()
    bzz = open(f'{base}/{part}.bzz', 'rb').read()
    print(f'=== TSK {part}: bzs={len(bzs)}B, bzz={len(bzz)}B ===')
    print(f'  bzz first 8: {bzz[:8].hex()}')

    # Full decompress
    try:
        t = zlib.decompress(bzz)
        print(f'  Full: {len(t)} chars')
    except Exception as e:
        print(f'  Full error: {e}')
        # Block by block
        cpos = 0
        parts = []
        for i in range(0, len(bzs) - 7, 8):
            doff, csize = struct.unpack('<II', bzs[i:i+8])
            if csize <= 0 or cpos + csize > len(bzz):
                continue
            chunk = bzz[cpos:cpos+csize]
            try:
                txt = zlib.decompress(chunk).decode('utf-8', errors='replace')
                parts.append(txt)
                if len(parts) <= 3:
                    print(f'  Block {i//8}: size={csize} -> {len(txt)}c')
            except Exception as ex:
                print(f'  Block {i//8}: cpos={cpos} size={csize} FAIL: {ex}')
            cpos += csize
        combined = ''.join(parts)
        print(f'  Block total: {len(combined)} chars')
        if combined:
            print(f'  Preview: {combined[:300]}')
    print()