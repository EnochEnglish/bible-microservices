import json, sys
from urllib.request import Request, urlopen

payload = {
    'source': 'TSK',
    'sourceName': 'Treasury of Scripture Knowledge',
    'commentaries': [{
        'bookId': 'GEN',
        'chapter': 1,
        'verseStart': 1,
        'verseEnd': 1,
        'text': 'God created: Prov 8.22-24; John 1.1-3'
    }]
}
data = json.dumps(payload).encode('utf-8')
req = Request('http://localhost:8081/api/v1/annotations/import-commentary', data=data,
              headers={'Content-Type': 'application/json'}, method='POST')
try:
    resp = urlopen(req, timeout=10)
    print("Status:", resp.status)
    print(resp.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
    body = ""
    try:
        body = e.read().decode('utf-8', errors='replace')
    except:
        pass
    print("Body:", body)