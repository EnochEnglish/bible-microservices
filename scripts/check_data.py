import json
from urllib.request import Request, urlopen

BASE = 'http://localhost:8081'

# Test KJV books
r = urlopen(BASE + '/api/v1/bible/kjv/books', timeout=5)
data = json.loads(r.read())
books = data if isinstance(data, list) else data.get('books', data.get('translations', []))
print(f'KJV books response: {json.dumps(data, indent=2)[:500]}')
