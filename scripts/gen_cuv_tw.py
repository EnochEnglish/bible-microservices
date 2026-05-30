"""
Convert CUV Simplified (cuv_gb) verses to Traditional (cuv_tw)
by querying the bible-text-service API and using opencc.
Outputs SQL INSERT statements ready for import.
"""
import urllib.request, json, time, sys
from opencc import OpenCC

BASE = "http://localhost:8080/api/v1/bible"
converter = OpenCC("s2t")  # simplified → traditional

def get(path):
    url = f"{BASE}/{path}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == 2: raise
            time.sleep(1)

def main():
    # 1. Get all books for cuv_gb
    books_data = get("cuv_gb/books")
    books = books_data.get("books", [])
    print(f"Found {len(books)} books for cuv_gb")

    out = open("cuv_tw_import.sql", "w", encoding="utf-8")
    out.write("-- CUV Traditional (cuv_tw) auto-generated\n")
    out.write("DELETE FROM verses WHERE translation_code='cuv_tw';\n")
    out.write("DELETE FROM books WHERE translation_code='cuv_tw';\n")
    out.write("DELETE FROM translations WHERE id='cuv_tw';\n\n")
    out.write("INSERT INTO translations (id, code, name, language, abbreviation, description) VALUES ('cuv_tw', 'cuv_tw', 'Chinese Union Version (Traditional)', 'chinese', 'CUV-T', '和合本繁體');\n\n")

    total_verses = 0
    for bi, book in enumerate(books):
        book_id = book["book_id"]
        book_name = book.get("name", book_id)
        book_order = book.get("order", bi + 1)
        chapter_count = book.get("chapter_count", 0)

        out.write(f"INSERT INTO books (translation_code, book_id, name, order_index, chapter_count) VALUES ('cuv_tw', '{book_id}', '{converter.convert(book_name)}', {book_order}, {chapter_count});\n")

        # Get each chapter (API requires /{translation}/{book}/{chapter})
        for ch in range(1, chapter_count + 1):
            verse_data = get(f"cuv_gb/{book_id}/{ch}")
            verses = verse_data.get("verses", [])
            for v in verses:
                vnum = v["verse"]
                text = v["text"]
                text_tw = converter.convert(text).replace("'", "''")  # escape SQL
                out.write(f"INSERT INTO verses (translation_code, book_id, chapter, verse, text) VALUES ('cuv_tw', '{book_id}', {ch}, {vnum}, '{text_tw}');\n")
                total_verses += 1

        print(f"  [{bi+1:2d}/{len(books)}] {book_id}: {converter.convert(book_name)} ({total_verses} verses so far)")

    out.close()
    print(f"\nDone! {total_verses} verses written to cuv_tw_import.sql")

if __name__ == "__main__":
    import time as _t; _t0 = _t.time()
    main()
    print(f"Elapsed: {_t.time() - _t0:.1f}s")