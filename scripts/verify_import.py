import json, urllib.request

def get_annotations(book, ch, source):
    url = f'http://localhost:8081/api/v1/annotations?bookId={book}&chapter={ch}&source={source}'
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())

# Test MHCC
print('=== MHCC Genesis 1 ===')
data = get_annotations('GEN', 1, 'MHCC')
print(f'Entries: {len(data)}')
for v in data[:2]:
    print(f'  {v.get("verseStart")}-{v.get("verseEnd")}: {v.get("text","")[:150]}...')

# Test JFB
print('\n=== JFB Mat 1 ===')
data = get_annotations('MAT', 1, 'JFB')
print(f'Entries: {len(data)}')
for v in data[:2]:
    print(f'  {v.get("verseStart")}-{v.get("verseEnd")}: {v.get("text","")[:150]}...')

# Test intersection (both sources)
print('\n=== TSK John 3 (existing) ===')
data = get_annotations('JHN', 3, 'TSK')
print(f'Entries: {len(data)}')
for v in data[:2]:
    print(f'  {v.get("verseStart")}-{v.get("verseEnd")}: {v.get("text","")[:150]}...')

# Count total
print('\n=== Counts ===')
for source in ['MHCC', 'JFB', 'TSK']:
    url = f'http://localhost:8081/api/v1/annotations?bookId=GEN&chapter=1&source={source}'
    try:
        resp = urllib.request.urlopen(url)
        entries = json.loads(resp.read())
        has = len(entries) > 0
    except:
        has = False
    print(f'  {source} Gen1: {"YES" if has else "no"}')