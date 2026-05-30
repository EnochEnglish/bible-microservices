import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# Direct search API
url = 'http://localhost:8082/api/v1/search/kjv?q=God'
try:
    with urllib.request.urlopen(url, timeout=5) as r:
        data = json.loads(r.read().decode('utf-8'))
        print('Search KJV God: OK')
        if isinstance(data, dict):
            keys = list(data.keys())
            print(f'Keys: {keys}')
        elif isinstance(data, list):
            print(f'Results: {len(data)}')
except Exception as e:
    print(f'Search direct error: {e}')

# Via gateway
url2 = 'http://localhost:8080/api/v1/search/kjv?q=love'
try:
    with urllib.request.urlopen(url2, timeout=5) as r:
        data2 = json.loads(r.read().decode('utf-8'))
        print('Gateway search: OK')
except Exception as e2:
    print(f'Gateway search error: {e2}')
