import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = 'http://localhost:8080/api/v1/bible/translations'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
print(f'Total: {len(data)}')
print(f'Type of first item: {type(data[0]).__name__}')
print(f'First 3 items: {data[:3]}')
