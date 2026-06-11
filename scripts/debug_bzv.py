import struct, os

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'
for part in ['ot', 'nt']:
    base = os.path.join(dl, 'TSK', 'modules', 'comments', 'zcom', 'tsk')
    bzv = open(os.path.join(base, f'{part}.bzv'), 'rb').read()
    bzs = open(os.path.join(base, f'{part}.bzs'), 'rb').read()
    print(f'TSK {part}: bzv={len(bzv)}B, bzs={len(bzs)}B')
    print(f'  First 32 bzv hex: {bzv[:32].hex()}')
    vals32 = struct.unpack(f'<{min(10, len(bzv)//4)}I', bzv[:40])
    print(f'  First 10 uint32: {vals32}')
    
    # Check if it's offset+size pairs (8 bytes each)
    if len(bzv) % 8 == 0:
        entries = []
        for i in range(0, len(bzv), 8):
            off, val = struct.unpack('<II', bzv[i:i+8])
            entries.append((off, val))
        print(f'  As [off,val] entries (first 5): {entries[:5]}')
    print()