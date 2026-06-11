import json, time
from urllib.request import Request, urlopen

JSON = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data\crossrefs_kjv_parsed.json'
with open(JSON, encoding='utf-8') as f:
    data = json.load(f)
print(f'Total records: {len(data)}')

imported = 0
for i in range(0, 1000, 500):
    batch = [{'bookId': c['bookId'], 'chapter': c['chapter'], 'verseStart': c['verseStart'], 'verseEnd': c['verseEnd'], 'text': c['text']} for c in data[i:i+500]]
    payload = json.dumps({'source': 'TSK', 'sourceName': 'Treasury of Scripture Knowledge', 'commentaries': batch}, ensure_ascii=False).encode('utf-8')
    req = Request('http://localhost:8081/api/v1/annotations/import-commentary', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        resp = urlopen(req, timeout=60)
        r = json.loads(resp.read().decode())
        imported += r.get('imported', 0)
        print(f'Batch {i//500+1}: imported={r["imported"]} skipped={r["skipped"]}')
    except Exception as e:
        print(f'Batch {i//500+1} FAILED: {e}')
        body = b''
        try: body = e.read()
        except: pass
        print(f'  Body: {body.decode("utf-8", errors="replace")[:300]}')

print(f'Total imported: {imported}')