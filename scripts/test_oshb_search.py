"""Test OSHB search."""
import urllib.request, urllib.parse, json, sys
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:8082/api/v1/search"

tests = [
    ("mal",                                  "oshb", "Malachi book"),
    ("text:gen",                             "oshb", "text:gen"),
    (urllib.parse.quote("\u05d0\u05dc\u05d4\u05d9\u05dd"),  "oshb", "Elohim (with vowels)"),
    (urllib.parse.quote("\u05d0\u05dc\u05d4\u05d9\u05dd", safe=""), "oshb", "Elohim unquoted"),
    ("book_id:gen",                          "oshb", "book_id:gen"),
]

for q, t, label in tests:
    url = f"{BASE}?query={q}&translation={t}"
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            d = json.loads(r.read())
            total = d.get("total", 0)
            sample = ""
            if d.get("results"):
                s = d["results"][0]
                txt = s.get("text", "")[:40].replace("\n", " ")
                sample = f" [{s.get('book_id')}{s.get('chapter')}:{s.get('verse')} {txt}]"
            print(f"Q '{label}': {total} hits{sample}")
    except Exception as e:
        print(f"Q '{label}': ERROR - {e}")
