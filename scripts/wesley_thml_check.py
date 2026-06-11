"""Analyze Wesley BZV format to map verses to text positions."""
import zlib, os, struct, re

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\_tmp_wesley\modules\comments\zcom\wesley"

with open(os.path.join(BASE, "ot.bzz"), "rb") as f:
    ot_text = zlib.decompress(f.read()).decode("utf-8", "replace")
with open(os.path.join(BASE, "nt.bzz"), "rb") as f:
    nt_text = zlib.decompress(f.read()[10:]).decode("utf-8", "replace")

with open(os.path.join(BASE, "ot.bzv"), "rb") as f:
    ot_bzv = f.read()
with open(os.path.join(BASE, "nt.bzv"), "rb") as f:
    nt_bzv = f.read()

print(f"OT: {len(ot_text)} chars, BZV: {len(ot_bzv)}B = {len(ot_bzv)//8} entries")
print(f"NT: {len(nt_text)} chars, BZV: {len(nt_bzv)}B = {len(nt_bzv)//8} entries")

# Try different BZV interpretations
# zCom BZV format: [offset:4BE][size:4BE] or [offset:4LE][size:4LE]
# or: [key:4][offset:4] where key encodes book/chapter/verse

def try_bzv(bzv_data, full_text, n=20):
    """Try various BZV interpretations."""
    count = len(bzv_data) // 8
    
    # Skip zeros at start
    start = 0
    for i in range(count):
        vals = struct.unpack('<II', bzv_data[i*8:i*8+8])
        if vals[0] != 0 or vals[1] != 0:
            start = i
            break
    
    print(f"\n  First non-zero entry: [{start}]")
    
    # Try little-endian (offset, size)
    print(f"\n  --- Little-endian uint32 x2 ---")
    ok = 0
    for i in range(start, min(start+n*3, count)):
        v1, v2 = struct.unpack('<II', bzv_data[i*8:i*8+8])
        in_range = v1 < len(full_text) and v1 + v2 <= len(full_text) and v2 > 0
        note = ""
        if in_range:
            ok += 1
            chunk = full_text[v1:v1+min(v2, 200)].replace('\n',' ')
            note = f"OFFSET OK: {chunk[:100]}"
        if i < start + n*2:
            print(f"    [{i}] ({v1}, {v2}) {note}")
    print(f"    in-range: {ok} / {min(n*3, count-start)}")

    # Try big-endian (offset, size)
    print(f"\n  --- Big-endian uint32 x2 ---")
    ok = 0
    for i in range(start, min(start+n*3, count)):
        v1, v2 = struct.unpack('>II', bzv_data[i*8:i*8+8])
        in_range = v1 < len(full_text) and v1 + v2 <= len(full_text) and v2 > 0
        note = ""
        if in_range:
            ok += 1
            chunk = full_text[v1:v1+min(v2, 200)].replace('\n',' ')
            note = f"OK: {chunk[:100]}"
        if i < start + n*2:
            print(f"    [{i}] ({v1}, {v2}) {note}")
    print(f"    in-range: {ok}")

    # Try (offset, key) where key = book<<16 | chapter or similar
    print(f"\n  --- (offset LE, key LE) ---")
    for i in range(start, min(start+15, count)):
        off, key = struct.unpack('<II', bzv_data[i*8:i*8+8])
        bk = (key >> 16) & 0xFFFF
        ch = key & 0xFF
        vs = (key >> 8) & 0xFF
        print(f"    [{i}] off={off} key={key} (book={bk}, ch={ch}, vs={vs})")

try_bzv(ot_bzv, ot_text)
try_bzv(nt_bzv, nt_text)
