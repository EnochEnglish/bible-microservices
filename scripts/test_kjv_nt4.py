import zlib

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')

# Show first 600 chars
print("=== First 600 chars ===")
print(text[:600])
print()

# Find all verse opening tags
import re
verse_opens = re.finditer(r'<verse\s+osisID="([^"]+)"[^>]*>', text)
vlist = [(m.group(1), m.start()) for m in verse_opens]
print(f"Total verse tags: {len(vlist)}")
for i in range(min(5, len(vlist))):
    print(f"  {vlist[i][0]} at pos {vlist[i][1]}")
if len(vlist) > 5:
    print(f"  ...")
    print(f"  {vlist[-1][0]} at pos {vlist[-1][1]}")
