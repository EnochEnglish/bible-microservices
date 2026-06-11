"""Test MHCC (zCom) vs JFB (zCom4) decompression."""
import struct, zlib
base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

for mod, driver in [('MHCC','zCom'), ('JFB','zCom4')]:
    print(f'\n===== {mod} ({driver}) =====')
    mod_path = base + '\\' + mod + '\\modules\\comments\\zcom\\' + mod.lower()
    
    for part in ['nt', 'ot']:
        with open(mod_path + '\\' + part + '.bzs', 'rb') as f:
            bzs = f.read()
        with open(mod_path + '\\' + part + '.bzz', 'rb') as f:
            bzz = f.read()
        
        entries = []
        for i in range(0, len(bzs), 8):
            v1 = struct.unpack('<I', bzs[i:i+4])[0]
            v2 = struct.unpack('<I', bzs[i+4:i+8])[0]
            entries.append((v1, v2))
        
        pos = 0
        success = 0
        total_decomp = 0
        for i, (v1, v2) in enumerate(entries):
            chunk = bzz[pos:pos+v2]
            try:
                text = zlib.decompress(chunk)
                success += 1
                total_decomp += len(text)
            except:
                pass
            pos += v2
        
        pct = success * 100 // len(entries)
        print(f'  {part}: {success}/{len(entries)} zlib-OK ({pct}%) decomp_total={total_decomp}')
        
        # Show first few failures
        if success < len(entries):
            pos = 0
            fails_shown = 0
            for i, (v1, v2) in enumerate(entries):
                chunk = bzz[pos:pos+v2]
                try:
                    zlib.decompress(chunk)
                except Exception as e:
                    if fails_shown < 2:
                        print(f'    fail[{i}]: bzz[{pos}:{pos+v2}] v1={v1} v2={v2}')
                        print(f'      hex: {chunk[:8].hex()}')
                    fails_shown += 1
                pos += v2