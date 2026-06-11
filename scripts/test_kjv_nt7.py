import sys, io, zlib, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')

# Look at chars 80-200 (around osisID at pos 91)
chunk = text[60:250]
safe = ''
for c in chunk:
    if ord(c) < 128 or c in ' \n\r\t':
        safe += c
    else:
        safe += f'[U+{ord(c):04X}]'
print(f"Chars 60-250: {safe}")
