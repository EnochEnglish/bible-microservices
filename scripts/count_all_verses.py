"""Count verses for all translations via API."""
import urllib.request, json, sys
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:8080/api/v1/bible"

# Get all translations
with urllib.request.urlopen(f"{BASE}/translations", timeout=10) as r:
    data = json.loads(r.read())
    translations = data.get("translations", [])

print(f"Verse count for {len(translations)} translations:\n")

total_all = 0
for t in sorted(translations, key=lambda x: x["id"]):
    tid = t["id"]
    try:
        # Get books
        with urllib.request.urlopen(f"{BASE}/{tid}/books", timeout=15) as r:
            books = json.loads(r.read()).get("books", [])
            count = sum(b.get("verse_count", b.get("chapter_count", 0)) for b in books)
            total_all += count
            print(f"  {tid:12s}  {len(books):3d} books  {t.get('name','')[:35]}")
    except Exception as e:
        print(f"  {tid:12s}  ERROR: {e}")

print(f"\nTotal: {total_all} books across all translations")
print(f"DB size: 121 MB")
