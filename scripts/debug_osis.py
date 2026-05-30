"""Debug bzv format by dumping raw bytes."""
import struct, os

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

for mod, part in [('MHCC','ot'), ('MHCC','nt'), ('JFB','ot'), ('JFB','nt')]:
    mod_path = os.path.join(base, mod, 'modules', 'comments', 'zcom', mod.lower())
    bzv_path = os.path.join(mod_path, f'{part}.bzv')
    
    with open(bzv_path, 'rb') as f:
        data = f.read()
    
    size = len(data)
    print(f'\n===== {mod} {part} ({size}B) =====')
    
    # Dump first 60 bytes raw
    print('Raw hex:')
    for i in range(0, min(60, size), 4):
        val = struct.unpack('<I', data[i:i+4])[0]
        print(f'  [{i:4d}] {data[i:i+4].hex()} = {val:>10d} (0x{val:08x})')

    # Try different field layouts
    # 1. 6 fields of 4 bytes each = 24-byte records
    # 2. 5 fields of 4 bytes each = 20-byte records
    # 3. 4 fields of 4 bytes = 16-byte records
    # 4. 3 fields of 4 bytes + 1 field of 2 bytes = 14-byte records
    
    for rec_size in [20, 12, 10]:
        if size % rec_size != 0:
            continue
        n = size // rec_size
        print(f'\n  rec_size={rec_size}, entries={n}')
        for i in range(min(4, n)):
            off = i * rec_size
            if rec_size == 20:
                f1 = struct.unpack('<I', data[off:off+4])[0]
                f2 = struct.unpack('<I', data[off+4:off+8])[0]
                f3 = struct.unpack('<I', data[off+8:off+12])[0]
                f4 = struct.unpack('<I', data[off+12:off+16])[0]
                f5 = struct.unpack('<I', data[off+16:off+20])[0]
                print(f'  [{i}] {f1}, {f2}, {f3}, {f4}, {f5}')
            elif rec_size == 12:
                f1 = struct.unpack('<I', data[off:off+4])[0]
                f2 = struct.unpack('<I', data[off+4:off+8])[0]
                f3 = struct.unpack('<I', data[off+8:off+12])[0]
                print(f'  [{i}] {f1:>10d} (0x{f1:08x}), {f2:>10d}, {f3:>10d}')
            elif rec_size == 10:
                f1 = struct.unpack('<I', data[off:off+4])[0]
                f2 = struct.unpack('<I', data[off+4:off+8])[0]
                f3 = struct.unpack('<H', data[off+8:off+10])[0]
                print(f'  [{i}] {f1:>10d} (0x{f1:08x}), {f2:>10d}, {f3:>10d}')