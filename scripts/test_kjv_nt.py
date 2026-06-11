import zlib, re

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

print(f"File size: {len(data)} bytes")

# Find zlib offsets
offsets = []
i = 0
while i < len(data)-1:
    if data[i]==0x78 and data[i+1] in (0x01,0x9C,0xDA,0x5E):
        offsets.append(i)
    i += 1

print(f"Total zlib headers: {len(offsets)}")

# Try first 5 blocks
for idx, off in enumerate(offsets[:5]):
    try:
        text = zlib.decompress(data[off:]).decode('utf-8', errors='replace')
        first_chars = text[:200].replace('\n', '\\n')
        has_verse = '<verse' in text[:5000]
        found_books = re.findall(r'sID="(\w+)\.\d+\.\d+"', text[:20000])
        unique_books = list(dict.fromkeys(found_books))
        print(f"\nBlock {idx} (offset={off}):")
        print(f"  Len={len(text)}, has_verse={has_verse}, books={unique_books[:5]}")
        print(f"  First 200: {first_chars}")
        if has_verse:
            first_verse = re.search(r'sID="([^"]+)"', text)
            if first_verse:
                print(f"  First verse: {first_verse.group(1)}")
    except Exception as e:
        print(f"\nBlock {idx} (offset={off}): FAIL - {e}")
