import urllib.request, urllib.parse, json, sys
sys.stdout.reconfigure(encoding='utf-8')

print('=== cuv_tw E2E Verification ===')
print()

# 1. Books
url = 'http://localhost:8080/api/v1/bible/cuv_tw/books'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'Books: {len(data["books"])}')

# 2. Gen 1 (chapter endpoint returns {verses: [...]})
url = 'http://localhost:8080/api/v1/bible/cuv_tw/Gen/1'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'Gen 1: {len(data["verses"])} verses')
print(f'  v1: {data["verses"][0]["text"]}')

# 3. John 3:16 (single verse returns flat object)
url = 'http://localhost:8080/api/v1/bible/cuv_tw/Jhn/3/16'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'John 3:16: {data["text"]}')

# 4. Random
url = 'http://localhost:8080/api/v1/bible/cuv_tw/random'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'Random: {data["reference"]} - {data["text"][:50]}')

# 5. Search 天國
q = urllib.parse.quote('天國')
url = f'http://localhost:8080/api/v1/search?query={q}&translation=cuv_tw'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'Search "天國": {data["total"]} results')

# 6. GB vs TW comparison
print()
print('=== GB vs TW ===')
url = 'http://localhost:8080/api/v1/bible/cuv_gb/Psa/23/1'
with urllib.request.urlopen(url) as r:
    gb = json.loads(r.read().decode('utf-8'))
url = 'http://localhost:8080/api/v1/bible/cuv_tw/Psa/23/1'
with urllib.request.urlopen(url) as r:
    tw = json.loads(r.read().decode('utf-8'))
print(f'GB: {gb["text"]}')
print(f'TW: {tw["text"]}')
print()
print('=== ALL TESTS PASSED ===')
