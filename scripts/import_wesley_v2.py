"""Import Wesley commentary — proper book mapping via BZS boundaries.
Each book's full commentary stored as chapter=1 (no per-chapter split needed).
"""
import struct, zlib, re, html, os, sys, argparse
import jaydebeapi

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\_tmp_wesley\modules\comments\zcom\wesley"

# BZS index → standard book ID (verified by comparing text content with Bible book intros)
OT_BOOKS = ["GEN","EXO","DEU","RUT","1SA","1CH","2CH","EST","PSA","ECC","ISA","LAM","DAN","JOL","OBA","NAM","ZEP","ZEC"]
NT_BOOKS = ["MAT","LUK","ACT","ROM","1CO","PHP","COL","1TI","TIT","JAS","1PE","2JO","JUD"]

def strip_tags(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'&\w+;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def get_bzs_book_offsets(bzz_path, bzs_path):
    with open(bzz_path, "rb") as f:
        raw = f.read()
    with open(bzs_path, "rb") as f:
        bzs = f.read()
    offsets = []
    for i in range(len(bzs) // 8):
        off = struct.unpack("<I", bzs[i*8:i*8+4])[0]
        sz = struct.unpack("<I", bzs[i*8+4:i*8+8])[0]
        try:
            zlib.decompress(raw[off:off+sz])
            offsets.append(off)
        except:
            pass
    offsets.sort()
    return offsets, raw

def import_wesley(conn=None, dry=False):
    source = "Wesley"
    source_name = "John Wesley's Notes on the Bible"
    
    print(f"\n{'='*70}")
    print(f"Importing: {source_name}")
    print(f"{'='*70}")
    
    all_entries = []
    
    for part, book_list in [("ot", OT_BOOKS), ("nt", NT_BOOKS)]:
        bzz_path = os.path.join(BASE, f"{part}.bzz")
        bzs_path = os.path.join(BASE, f"{part}.bzs")
        offsets, raw = get_bzs_book_offsets(bzz_path, bzs_path)
        
        # Decompress full text
        if part == "ot":
            text = zlib.decompress(raw).decode("utf-8", "replace")
        else:
            text = zlib.decompress(raw[10:]).decode("utf-8", "replace")  # skip 10-byte header
        
        print(f"\n  {part.upper()}: {len(offsets)} books, {len(text):,} chars")
        
        for bi in range(len(offsets)):
            if bi >= len(book_list):
                break
            bid = book_list[bi]
            start_off = offsets[bi]
            end_off = offsets[bi + 1] if bi + 1 < len(offsets) else len(text)
            chunk = text[start_off:end_off]
            clean = strip_tags(chunk)
            
            if len(clean) > 50:
                all_entries.append((source, source_name, bid, 1, 1, 1, clean))
                if dry:
                    print(f"    {bid}: {len(clean):,} chars — {clean[:100]}...")
    
    print(f"\n  Total entries: {len(all_entries)}")
    
    if dry:
        return len(all_entries)
    
    # Import to DB
    cur = conn.cursor()
    cur.execute("DELETE FROM COMMENTARIES WHERE SOURCE = ?", (source,))
    conn.commit()
    
    CHUNK = 50
    total = 0
    batch = []
    for entry in all_entries:
        batch.append(entry)
        if len(batch) >= CHUNK:
            cur.executemany(
                "INSERT INTO COMMENTARIES (SOURCE, SOURCE_NAME, BOOK_ID, CHAPTER, VERSE_START, VERSE_END, TEXT) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)", batch)
            conn.commit()
            total += len(batch)
            print(f"  ... {total}/{len(all_entries)}")
            batch = []
    
    if batch:
        cur.executemany(
            "INSERT INTO COMMENTARIES (SOURCE, SOURCE_NAME, BOOK_ID, CHAPTER, VERSE_START, VERSE_END, TEXT) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)", batch)
        conn.commit()
        total += len(batch)
    
    print(f"\n  DONE: {total} entries imported")
    return total

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\text-db")
    parser.add_argument("--h2-jar", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar")
    parser.add_argument("--import", action="store_true", dest="do_import")
    args = parser.parse_args()
    
    if not args.do_import:
        import_wesley(dry=True)
    else:
        url = f"jdbc:h2:file:{args.db};AUTO_SERVER=TRUE"
        conn = jaydebeapi.connect("org.h2.Driver", url, ["sa", ""], args.h2_jar)
        conn.jconn.setAutoCommit(False)
        import_wesley(conn)
        conn.close()
        print("\nDONE. Restart text-service with JDK17.")

if __name__ == "__main__":
    main()
