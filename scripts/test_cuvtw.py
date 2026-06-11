import urllib.request, urllib.parse, json, sys
sys.stdout.reconfigure(encoding='utf-8')

tests = [('神', 'god'), ('耶穌', 'jesus'), ('愛', 'love'), ('起初', 'beginning')]
for word, eng in tests:
    q = urllib.parse.quote(word)
    url = f'http://localhost:8082/api/v1/search?query={q}&translation=cuv_tw'
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            total = data.get('total', '?')
            print(f'{word}({eng}): {total} results')
    except Exception as e:
        print(f'{word}: ERROR - {e}')

# Also test via gateway
print()
try:
    q = urllib.parse.quote('神')
    url = f'http://localhost:8080/api/v1/search?query={q}&translation=cuv_tw'
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.loads(r.read().decode('utf-8'))
        print(f'Gateway search: {data.get("total", "?")} results for "神"')
except Exception as e:
    print(f'Gateway: ERROR - {e}')