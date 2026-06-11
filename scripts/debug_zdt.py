"""Simple extraction: get G1 directly from decompressed data."""
import struct, zlib, re

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\StrongsGreek\modules\lexdict\zld\strongsgreek'
with open(base + r'\dict.zdx', 'rb') as f: zdx = f.read()
with open(base + r'\dict.zdt', 'rb') as f: zdt = f.read()

# Decompress ALL blocks with errors='replace'
all_text = ""
for i in range(0, len(zdx), 8):
    off = struct.unpack_from('<I', zdx, i)[0]
    sz = struct.unpack_from('<I', zdx, i+4)[0]
    raw = zdt[off:off+sz]
    try:
        data = zlib.decompress(raw)
        text = data.decode('utf-8', errors='replace')
        all_text += text
    except:
        pass

# Find entry n="1"
m = re.search(r'<entryFree n="1">(.*?)</entryFree>', all_text, re.DOTALL)
if m:
    content = m.group(1)
    # Save entire content for inspection
    out = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\entry1_dump.txt'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(content[:3000])
    print(f"Saved to {out}")
    print(f"Length: {len(content)}")
    
    # Try simple orth extraction
    orth_simple = re.search(r'<orth>(.*?)</orth>', content, re.DOTALL)
    if orth_simple:
        val = orth_simple.group(1).strip()
        print(f"Simple orth match: {repr(val[:50])}")
        print(f"Unicode chars: {[hex(ord(c)) for c in val[:10]]}")