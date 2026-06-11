"""Import Wesley — 2 entries: OT commentary as GEN/1, NT as MAT/1.
Wesley OT = Genesis commentary only (~360KB)
Wesley NT = continuous NT flow (~203KB)
"""
import struct, zlib, re, html, os, sys, argparse
import jaydebeapi

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\_tmp_wesley\modules\comments\zcom\wesley"

def strip_tags(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'&\w+;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def import_wesley(conn=None, dry=False):
    source = "Wesley"
    source_name = "John Wesley's Notes on the Bible"
    
    print(f"\n{'='*70}")
    print(f"Importing: {source_name}")
    print(f"{'='*70}")
    
    entries = []
    
    # OT: Genesis commentary
    with open(os.path.join(BASE, "ot.bzz"), "rb") as f:
        ot_text = zlib.decompress(f.read()).decode("utf-8", "replace")
    ot_clean = strip_tags(ot_text)
    entries.append((source, source_name, "GEN", 1, 1, 1, ot_clean))
    print(f"  OT (GEN): {len(ot_text):,} raw chars → {len(ot_clean):,} clean")
    
    # NT: Matthew+ commentary
    with open(os.path.join(BASE, "nt.bzz"), "rb") as f:
        raw = f.read()
    nt_text = zlib.decompress(raw[10:]).decode("utf-8", "replace")
    nt_clean = strip_tags(nt_text)
    entries.append((source, source_name, "MAT", 1, 1, 1, nt_clean))
    print(f"  NT (MAT): {len(nt_text):,} raw chars → {len(nt_clean):,} clean")
    
    if dry:
        print(f"\n  Dry run: {len(entries)} entries")
        print(f"  OT preview: {ot_clean[:200]}...")
        print(f"  NT preview: {nt_clean[:200]}...")
        return len(entries)
    
    # Import
    cur = conn.cursor()
    cur.execute("DELETE FROM COMMENTARIES WHERE SOURCE = ?", (source,))
    conn.commit()
    
    cur.executemany(
        "INSERT INTO COMMENTARIES (SOURCE, SOURCE_NAME, BOOK_ID, CHAPTER, VERSE_START, VERSE_END, TEXT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)", entries)
    conn.commit()
    
    print(f"\n  DONE: {len(entries)} entries imported")
    return len(entries)

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
        print("\nAll done. Restart text-service with JDK17.")

if __name__ == "__main__":
    main()
