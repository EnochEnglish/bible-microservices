import sys, io, zlib, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')
print(f"Total chars: {len(text)}")

# Show raw text around position 400-600
chunk = text[400:700]
# Replace non-printable but keep ASCII
safe = ''
for c in chunk:
    if ord(c) < 128 or c in ' \n\r\t':
        safe += c
    else:
        safe += f'[U+{ord(c):04X}]'
print(f"\nChars 400-700: {safe}")

# Find verse by looking for common patterns
for pattern in ['<verse', 'osisID', 'Matt', 'verse>', 'verse ']:
    pos = text.find(pattern)
    print(f"  '{pattern}' at pos {pos}")
