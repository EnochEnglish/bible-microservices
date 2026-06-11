"""Parse TSK (Treasury of Scripture Knowledge) from SWORD zCom module."""
import struct, zlib, os, re

DL = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

def decompress_zcom(name, moddir, part):
    """Decompress a zCom module part (OT or NT)."""
    base = os.path.join(DL, name, 'modules', 'comments', moddir, name.lower())
    bzs = open(f'{base}/{part}.bzs', 'rb').read()
    bzz = open(f'{base}/{part}.bzz', 'rb').read()
    
    entries = []
    for i in range(0, len(bzs) - 7, 8):
        doff, csize = struct.unpack('<II', bzs[i:i+8])
        if csize > 0:
            entries.append((doff, csize))
    
    # Decompress entire file as one zlib stream
    try:
        text = zlib.decompress(bzz).decode('utf-8', errors='replace')
        return text
    except:
        # Block by block
        parts = []
        cpos = 0
        for doff, csize in entries:
            chunk = bzz[cpos:cpos+csize]
            try:
                parts.append(zlib.decompress(chunk).decode('utf-8', errors='replace'))
            except:
                pass
            cpos += csize
        return ''.join(parts)


def parse_tsk():
    """Parse TSK and output the structure."""
    for part in ['ot', 'nt']:
        text = decompress_zcom('TSK', 'zcom', part)
        print(f"\n=== TSK {part}: {len(text)} chars ===")
        
        # Show first 3000 chars to understand structure
        print(text[:3000])
        print("\n... (middle) ...\n")
        # Show a chapter boundary
        # Find "Ge 2" or similar
        for marker in ['<br /><scripRef passage="Ge 2:', '<br /><scripRef passage="Ps 1:',
                        '<br /><scripRef passage="Mt 1:', '<br /><scripRef passage="Joh 3:']:
            idx = text.find(marker)
            if idx >= 0:
                print(f"\n--- Found '{marker}' at {idx} ---")
                print(text[max(0,idx-100):idx+500])
                break
        

if __name__ == '__main__':
    parse_tsk()
