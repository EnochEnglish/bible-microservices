import jaydebeapi, zlib, re

# Check verse_key format
conn = jaydebeapi.connect('org.h2.Driver',
    'jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db',
    ['sa', ''],
    r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar')
c = conn.cursor()

print("=== Verse key format check ===")
for book_id in ['gen', 'exo', 'mat', 'mrk', 'rev']:
    c.execute("SELECT v.verse_key FROM verses v JOIN books b ON v.book_id=b.id JOIN translations t ON b.translation_id=t.id WHERE t.code='kjv' AND b.book_id=? AND v.chapter=1 AND v.verse=1", [book_id])
    row = c.fetchone()
    if row:
        print(f"  {book_id}: {row[0]}")

print("\n=== BZZ parsing test ===")
bzz_path = r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz"
with open(bzz_path, 'rb') as f:
    data = f.read()

offsets = []
i = 0
while i < len(data)-1:
    if data[i]==0x78 and data[i+1] in (0x01,0x9C,0xDA,0x5E):
        offsets.append(i)
    i += 1

for off in offsets[:1]:
    try:
        text = zlib.decompress(data[off:]).decode('utf-8')
        if '<verse' in text[:1000]:
            m = re.search(r'<verse\s+sID="([^"]+)"', text)
            if m:
                print(f"  First verse sID: {m.group(1)}")
            verses = re.findall(r'<verse\s+sID="([^"]+)"', text)
            print(f"  Total verse markers: {len(verses)}")
            print(f"  Range: {verses[0]} -> {verses[-1]}")
            # Sample words
            words = re.findall(r'<w\s[^>]*>([^<]+)</w>', text)
            print(f"  <w> tags: {len(words)}")
            if words:
                print(f"  Sample words: {words[:5]}")
            break
    except:
        continue

print("\n=== Expected mapping ===")
print("OSIS Gen.1.1 -> verse_key kjv.gen.1.1 -> match OK")

c.close()
conn.close()
