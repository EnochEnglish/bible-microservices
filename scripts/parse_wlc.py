import zlib, struct, os, re, json

base = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\WLC\modules\texts\ztext\wlc"

bzs_data = open(os.path.join(base, "ot.bzs"), "rb").read()
bzz_data = open(os.path.join(base, "ot.bzz"), "rb").read()

# Try LZSS for failing blocks
all_text = b""
ok = 0
fail = 0
for i in range(0, len(bzs_data), 8):
    off, sz = struct.unpack_from("<II", bzs_data, i)
    if sz == 0:
        continue
    try:
        decompressed = zlib.decompress(bzz_data[off:off+sz])
        all_text += decompressed
        ok += 1
    except:
        fail += 1

text = all_text.decode("utf-8", errors="replace")
print(f"OK={ok}, FAIL={fail}, decompressed={len(text)} chars")

# Save to file
with open(os.path.join(os.path.dirname(base), "wlc_text.txt"), "w", encoding="utf-8") as f:
    f.write(text[:500000])

# Find Strong's lemma tags
import re
lemma_pat = re.compile(r'lemma="strong:([HG]\d+)"')
matches = lemma_pat.findall(text)
unique = set(matches)
print(f"Lemma tags: {len(matches)} occurrences, {len(unique)} unique")
h_only = [m for m in unique if m.startswith('H')]
print(f"Hebrew: {len(h_only)} unique Strong's numbers")

# Also find the Hebrew word associated with each lemma
word_pat = re.compile(r'<w lemma="strong:(H\d+)"[^>]*>([^<]+)</w>')
word_matches = word_pat.findall(text)
print(f"Word-lemma pairs: {len(word_matches)}")

# Build Strong's → Hebrew words mapping
from collections import defaultdict
strongs_hebrew = defaultdict(set)
for strongs_id, hebrew_word in word_matches:
    strongs_hebrew[strongs_id].add(hebrew_word.strip())

print(f"\nMapping size: {len(strongs_hebrew)}")
# Show samples
for sid in list(strongs_hebrew.keys())[:10]:
    words = strongs_hebrew[sid]
    print(f"  {sid}: {', '.join(list(words)[:5])}")

# Save mapping
mapping_path = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\wlc_strongs_hebrew.json"
with open(mapping_path, "w", encoding="utf-8") as f:
    json.dump({k: list(v) for k, v in strongs_hebrew.items()}, f, ensure_ascii=False, indent=2)
print(f"\nSaved mapping to {mapping_path}")

# Check first 3000 chars of text
print("\n=== TEXT SAMPLE ===")
print(text[:3000])