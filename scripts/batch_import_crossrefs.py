"""
Import cross-references from pre-parsed JSON to bible-text-service API.
Reads crossrefs_kjv_parsed.json and posts in batches.
"""
import json, time, sys
from urllib.request import Request, urlopen

JSON_PATH = sys.argv[1] if len(sys.argv) > 1 else "commentary_data/crossrefs_kjv_parsed.json"
API_BASE = "http://localhost:8081"
BATCH_SIZE = 500
SLEEP_BETWEEN = 0.2

import os
os.chdir(os.path.dirname(__file__) or '.')

with open(JSON_PATH, encoding='utf-8') as f:
    commentaries = json.load(f)

print(f"Loaded {len(commentaries)} commentary records from {JSON_PATH}")

imported = 0
failed = 0
skipped = 0
batch_count = (len(commentaries) + BATCH_SIZE - 1) // BATCH_SIZE

start = time.time()
for i in range(0, len(commentaries), BATCH_SIZE):
    batch = commentaries[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    
    # Strip extra fields from records
    clean_batch = []
    for c in batch:
        clean_batch.append({
            "bookId": c["bookId"],
            "chapter": c["chapter"],
            "verseStart": c["verseStart"],
            "verseEnd": c["verseEnd"],
            "text": c["text"]
        })
    
    payload = {
        "source": "TSK",
        "sourceName": "Treasury of Scripture Knowledge",
        "commentaries": clean_batch
    }
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    
    try:
        req = Request(
            f"{API_BASE}/api/v1/annotations/import-commentary",
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        resp = urlopen(req, timeout=120)
        result = json.loads(resp.read().decode('utf-8'))
        imported += result.get('imported', 0)
        skipped += result.get('skipped', 0)
        
        elapsed = time.time() - start
        rps = imported / elapsed if elapsed > 0 else 0
        pct = batch_num * 100 / batch_count
        print(f"\r[{batch_num}/{batch_count}] {pct:.0f}% | imp={imported} skip={skipped} | {rps:.0f} rec/s", end='')
        
        time.sleep(SLEEP_BETWEEN)
    except Exception as e:
        failed += len(batch)
        body = ""
        try:
            body = e.read().decode('utf-8', errors='replace')[:200]
        except:
            pass
        print(f"\n  Batch {batch_num} FAILED: {e} | {body}")

elapsed = time.time() - start
print(f"\n\nDone in {elapsed:.1f}s!")
print(f"Imported: {imported}, Skipped: {skipped}, Failed: {failed}")
print(f"Rate: {imported / elapsed:.0f} records/sec")