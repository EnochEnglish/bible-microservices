import zlib, re

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

# Decompress block at offset 1110 (the real NT data)
text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')
print(f"Decompressed length: {len(text)} chars")

# Search for <verse tags
verses = re.findall(r'<verse\s+sID="([^"]+)"', text)
print(f"Total <verse sID> found: {len(verses)}")
if verses:
    print(f"First 5: {verses[:5]}")
    print(f"Last 5: {verses[-5:]}")

# Search for <w tags
words = re.findall(r'<w\s', text)
print(f"Total <w> tags: {len(words)}")

# Get full first verse content
first_vs = re.search(r'(<verse\s+sID="([^"]+)".*?</w>\s*</verse\s+eID="([^"]+)")', text, re.DOTALL)
if first_vs:
    print(f"\n=== First complete verse ===")
    print(first_vs.group(1)[:500])

# Check for sample verse with Strong's
s = re.search(r'<verse\s+sID="Matt\.1\.1".*?</w>', text, re.DOTALL)
if s:
    print(f"\n=== Matt 1:1 ===")
    print(s.group(0)[:800])

# Check OSIS book divs
books_found = re.findall(r'osisID="(\w+)"', text)
print(f"\n=== Books found: {list(dict.fromkeys(books_found))}")
