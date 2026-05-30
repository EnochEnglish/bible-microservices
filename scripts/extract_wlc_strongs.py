#!/usr/bin/env python3
"""Extract Strong's H → Hebrew word mapping from WLC using pysword."""
import re, json, sys
from collections import defaultdict
from pysword.modules import SwordModules

MODPATH = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\WLC"
OUT = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\strongs_hebrew_words.json"

m = SwordModules(MODPATH)
m.parse_modules()
wlc = m.get_bible_from_module("WLC")
struc = wlc.get_structure()

# OSIS lemma pattern
lemma_re = re.compile(r'<w\s+lemma="strong:(H\d+)"[^>]*>([^<]+)</w>')
strongs = defaultdict(set)
skipped_books = 0

for book_name in struc.get_books():
    try:
        book_text = wlc.get([book_name])
        if not book_text or not book_text.strip():
            continue
        s = str(book_text)
        for match in lemma_re.finditer(s):
            sid = match.group(1)
            heb = match.group(2).strip()
            if heb:
                strongs[sid].add(heb)
        if "strong:" in s:
            print(f"  {book_name}: Found Strong's markup")
    except Exception as e:
        skipped_books += 1
        if skipped_books <= 3:
            print(f"  {book_name}: skip ({e})")

print(f"\nUnique Strong's: {len(strongs)}")
for sid in sorted(strongs)[:15]:
    print(f"  {sid}: {' | '.join(sorted(strongs[sid])[:5])}")

if strongs:
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({k: sorted(v) for k, v in strongs.items()}, f, ensure_ascii=False)
    print(f"\nSaved {len(strongs)} mappings → {OUT}")
else:
    # Debug: dump raw book text
    print("\nNo Strong's found! Dumping raw Gen text:")
    print(repr(str(wlc.get(["Genesis"]))[:2000]))