"""Debug H1 first line raw bytes."""
import re

dat = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\StrongsHebrew\modules\lexdict\rawld\strongshebrew\strongshebrew.dat'
with open(dat, 'rb') as f:
    data = f.read()

# Find first $$T and get body
text = data.decode('utf-8', errors='replace')
m = re.search(r'\$\$T(\d{7})\s*\n', text)
if m:
    body_start = m.end()
    # Show raw bytes for first 60 bytes after first $$
    raw = data[m.start():m.start()+80]
    print("Raw bytes (hex):")
    for i in range(0, len(raw), 16):
        hex_str = ' '.join(f'{b:02x}' for b in raw[i:i+16])
        ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in raw[i:i+16])
        print(f'  {i:04x}: {hex_str:<48s} {ascii_str}')
    
    # Decoded text
    decoded = raw.decode('utf-8', errors='replace')
    print(f"\nDecoded: {repr(decoded)}")
    
    # Now show second entry
    m2 = re.search(r'\$\$T(\d{7})\s*\n', text, body_start)
    if m2:
        raw2 = data[m2.start():m2.start()+80]
        print(f"\n\nEntry 2 raw hex:")
        for i in range(0, len(raw2), 16):
            hex_str = ' '.join(f'{b:02x}' for b in raw2[i:i+16])
            ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in raw2[i:i+16])
            print(f'  {i:04x}: {hex_str:<48s} {ascii_str}')
        decoded2 = raw2.decode('utf-8', errors='replace')
        print(f"Decoded2: {repr(decoded2)}")