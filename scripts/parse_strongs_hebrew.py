"""Parse Hebrew Strong's dictionary - v3: handle inconsistent quote formatting."""
import re, json

dat = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\StrongsHebrew\modules\lexdict\rawld\strongshebrew\strongshebrew.dat'
with open(dat, 'rb') as f:
    data = f.read()

text = data.decode('utf-8', errors='replace')
print(f"Total chars: {len(text):,}")

pattern = re.compile(r'\$\$T(\d{7})\s*\n\\(\d{5})\\\n')
entries = []
pos = 0
issues = 0

while True:
    m = pattern.search(text, pos)
    if not m:
        break
    
    strongs = int(m.group(1))
    
    body_start = m.end()
    next_m = pattern.search(text, body_start)
    body_end = next_m.start() if next_m else len(text)
    body = text[body_start:body_end]
    
    entry = {'strongs': strongs, 'original_word': '', 'transliteration': '', 'pronunciation': '', 'definition': ''}
    
    # First line = " N  'word  translit' \r\n"  or  " N  'word  translit\r\n"
    first_nl_pos = body.find('\n')
    first_line = body[:first_nl_pos] if first_nl_pos > 0 else body
    
    # Match: ' + content + either ' or end-of-line
    # Quote goes from first ' to either closing ' or EOL
    quote_match = re.search(r"'(.+?)(?:'|$)", first_line)
    if quote_match:
        quoted = quote_match.group(1).strip()
        parts = quoted.split(None, 1)
        if parts:
            entry['original_word'] = parts[0]
            if len(parts) > 1:
                entry['transliteration'] = parts[1]
    
    if not entry['original_word'] and first_line.strip():
        issues += 1
        # Fallback: try to extract first word-like text after the leading number
        bare = re.sub(r'^\s*\d+\s*', '', first_line)
        # Remove leading quote if present
        bare = re.sub(r"^'", '', bare)
        parts = bare.split(None, 2)
        if parts:
            entry['original_word'] = parts[0]
            if len(parts) > 1:
                entry['transliteration'] = parts[1]
    
    # Pronunciation
    pron_match = re.search(r'\{([^}]+)\}', body[:500])
    if pron_match:
        entry['pronunciation'] = pron_match.group(1).strip()
    
    # Definition: after first blank line
    def_match = re.search(r'\r?\n\s*\r?\n\s*(.+)', body, re.DOTALL)
    if def_match:
        entry['definition'] = re.sub(r'\s+', ' ', def_match.group(1)).strip()
    elif first_nl_pos > 0:
        entry['definition'] = re.sub(r'\s+', ' ', body[first_nl_pos+1:]).strip()
    
    entries.append(entry)
    pos = body_end

print(f"Entries parsed: {len(entries)}, issues: {issues}")

# Verify first few
for i in range(min(6, len(entries))):
    e = entries[i]
    print(f"H{e['strongs']}: word='{e['original_word']}' trans='{e['transliteration']}' def={e['definition'][:60]}")
print(f"...")
for e in entries[1253:1256]:
    print(f"H{e['strongs']}: word='{e['original_word']}' trans='{e['transliteration']}' def={e['definition'][:60]}")

# Save JSON
out = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\strongs_hebrew.json'
entry_list = sorted(entries, key=lambda x: x['strongs'])
with open(out, 'w', encoding='utf-8') as f:
    json.dump(entry_list, f, ensure_ascii=False, indent=2)
print(f"\nSaved {len(entry_list)} entries to {out}")

# Save samples  
sample_file = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\hebrew_samples.txt'
with open(sample_file, 'w', encoding='utf-8') as f:
    for e in entry_list[:25]:
        f.write(f"H{e['strongs']}: word='{e['original_word']}' trans='{e['transliteration']}' pron='{e['pronunciation']}'\n")
        f.write(f"  def={e['definition'][:150]}\n\n")
print(f"Samples saved to {sample_file}")