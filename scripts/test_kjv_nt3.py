import zlib, re

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')
print(f"Decompressed: {len(text)} chars")

# Find first <w tag and show surrounding context
first_w = text.find('<w ')
print(f"\nFirst <w at position {first_w}")
print(text[first_w-300:first_w+300])

# Also: check all tag names used
tags = re.findall(r'<(/?)(\w+)', text[:50000])
tag_names = set(t[1] for t in tags)
print(f"\nTag names in first 50K: {sorted(tag_names)}")

# Check for verse-related tags specifically
for tag in ['verse', 'div', 'chapter', 'milestone']:
    count = text.count(f'<{tag}')
    print(f"  <{tag}> count: {count}")
