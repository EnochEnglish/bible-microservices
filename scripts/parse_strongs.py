"""Parse Strong's Greek from decompressed zDT using binary offset header."""
import struct, zlib, re, os, json

base = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts'
greek_dir = base + r'\StrongsGreek\modules\lexdict\zld\strongsgreek'

with open(greek_dir + r'\dict.zdx', 'rb') as f: zdx = f.read()
with open(greek_dir + r'\dict.zdt', 'rb') as f: zdt = f.read()

# Parse zDX blocks (LE)
blocks = [(struct.unpack_from('<I', zdx, i)[0], struct.unpack_from('<I', zdx, i+4)[0]) 
          for i in range(0, len(zdx), 8)]

# Decompress all blocks with errors='replace' for UTF-8
all_text = ""
for off, sz in blocks:
    raw = zdt[off:off+sz]
    try:
        data = zlib.decompress(raw)
        text = data.decode('utf-8', errors='replace')
        all_text += text
    except:
        pass

print(f"Total decompressed: {len(all_text):,} chars")
print(f"Sample (4000:4100): {repr(all_text[4000:4100])}")

# Extract entryFree elements
entries = {}
pattern = re.compile(r'<entryFree\s+n="(\d+)">(.*?)</entryFree>', re.DOTALL)
for m in pattern.finditer(all_text):
    num = int(m.group(1))
    content = m.group(2).strip()
    if num == 0:
        continue  # skip preamble
    
    entry = {'strongs': num}
    # Match <orth> without any attributes (no type, no rend)
    orth_m = re.search(r'<orth>(.*?)</orth>', content, re.DOTALL)
    if orth_m:
        entry['original_word'] = orth_m.group(1).strip()
    
    trans_m = re.search(r'<orth\s+type="trans"[^>]*>\s*(.*?)\s*</orth>', content, re.DOTALL)
    if trans_m:
        entry['transliteration'] = re.sub(r'<[^>]+>', '', trans_m.group(1)).strip()
    
    pron_m = re.search(r'<pron[^>]*>\s*(.*?)\s*</pron>', content, re.DOTALL)
    if pron_m:
        entry['pronunciation'] = re.sub(r'<[^>]+>', '', pron_m.group(1)).strip()
    
    def_m = re.search(r'<def>(.*?)</def>', content, re.DOTALL)
    if def_m:
        entry['definition'] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', def_m.group(1))).strip()
    
    pos_m = re.search(r'<pos>(.*?)</pos>', content, re.DOTALL)
    if pos_m:
        entry['pos'] = re.sub(r'<[^>]+>', '', pos_m.group(1)).strip()
    
    entries[num] = entry

print(f"Entries found: {len(entries)}")

# Samples (write to file to avoid console encoding issues)
sample_lines = [f"G{num}: word={e.get('original_word','?')[:20]} trans={e.get('transliteration','')[:15]} def={e.get('definition','')[:60]}" for num, e in sorted(entries.items())[:10] if num > 0]
with open(os.path.join(base, 'greek_samples.txt'), 'w', encoding='utf-8') as sf:
    sf.write('\n'.join(sample_lines))

# Save
out = os.path.join(base, 'strongs_greek.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(sorted(entries.values(), key=lambda x: x['strongs']), f, ensure_ascii=False, indent=2)
print(f"\nSaved {len(entries)} entries to {out}")