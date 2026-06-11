import sys, io, zlib, re

# Force UTF-8 for all output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

text = zlib.decompress(data[1110:]).decode('utf-8', errors='replace')

# Find pairs: (<verse osisID="X">, </verse>)
verse_opens = list(re.finditer(r'<verse\s+osisID="([^"]+)"[^>]*>', text))
verse_closes = list(re.finditer(r'</verse>', text))

print(f"Verse opens: {len(verse_opens)}, closes: {len(verse_closes)}")
if verse_opens and verse_closes:
    print(f"First: {verse_opens[0].group(1)} at {verse_opens[0].start()}")
    print(f"Last:  {verse_opens[-1].group(1)} at {verse_opens[-1].start()}")
