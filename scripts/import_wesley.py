"""Import Wesley and Gill commentaries - simplified approach.
Wesley: Full decompress, split by BZV unique offsets, sequential numbering.
Gill: Download from alternative source or skip.
"""
import struct, zlib, re, html, os, sys, argparse, time
import jaydebeapi

BASE_WESLEY = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods\_tmp_wesley\modules\comments\zcom\wesley"

def strip_tags(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'&[a-z]+;', ' ', text)
    text = re.sub(r'\xa0', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_unique_segments(bzv_path, full_text, min_gap=1500):
    """Extract segments using unique BZV offsets.
    Filters offsets to keep only those with significant gaps (>min_gap).
    Always starts from offset 0."""
    with open(bzv_path, 'rb') as f:
        bzv = f.read()
    
    offsets = set()
    offsets.add(0)
    for i in range(len(bzv) // 8):
        v1 = struct.unpack('<I', bzv[i*8:i*8+4])[0]
        if v1 < len(full_text):
            offsets.add(v1)
    
    sorted_offs = sorted(offsets)
    
    # Filter: only keep offsets with large enough gaps
    filtered = [0]
    for off in sorted_offs:
        if off - filtered[-1] >= min_gap:
            filtered.append(off)
    
    segments = []
    for i, off in enumerate(filtered):
        next_off = filtered[i+1] if i+1 < len(filtered) else len(full_text)
        chunk = strip_tags(full_text[off:next_off])
        if len(chunk) > 50:
            segments.append((off, chunk[:8000]))
    
    return segments

def import_wesley(conn, dry=False):
    source = "Wesley"
    source_name = "John Wesley's Notes on the Bible"
    
    print(f"\n{'='*70}")
    print(f"Importing: {source_name}")
    print(f"{'='*70}")
    
    with open(os.path.join(BASE_WESLEY, 'ot.bzz'), 'rb') as f:
        ot_text = zlib.decompress(f.read()).decode('utf-8', 'replace')
    with open(os.path.join(BASE_WESLEY, 'nt.bzz'), 'rb') as f:
        nt_text = zlib.decompress(f.read()[10:]).decode('utf-8', 'replace')
    
    ot_segs = extract_unique_segments(os.path.join(BASE_WESLEY, 'ot.bzv'), ot_text)
    nt_segs = extract_unique_segments(os.path.join(BASE_WESLEY, 'nt.bzv'), nt_text)
    
    print(f"  OT segments: {len(ot_segs)}, NT segments: {len(nt_segs)}")
    
    if dry:
        for i, (off, chunk) in enumerate(ot_segs[:5]):
            print(f"  [{i}] off={off}: {chunk[:120]}...")
        for i, (off, chunk) in enumerate(nt_segs[:5]):
            print(f"  [{i}+OT] off={off}: {chunk[:120]}...")
        return len(ot_segs) + len(nt_segs)
    
    # Delete existing + import
    cur = conn.cursor()
    cur.execute("DELETE FROM COMMENTARIES WHERE SOURCE = ?", (source,))
    conn.commit()
    
    CHUNK = 500
    batch = []
    total = 0
    
    for testament, segs in [("OT", ot_segs), ("NT", nt_segs)]:
        for i, (off, txt) in enumerate(segs):
            batch.append((source, source_name, "WES", i+1, 1, 1, txt))
            if len(batch) >= CHUNK:
                cur.executemany(
                    "INSERT INTO COMMENTARIES (SOURCE, SOURCE_NAME, BOOK_ID, CHAPTER, VERSE_START, VERSE_END, TEXT) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)", batch)
                conn.commit()
                total += len(batch)
                print(f"  ... {total}")
                batch = []
    
    if batch:
        cur.executemany(
            "INSERT INTO COMMENTARIES (SOURCE, SOURCE_NAME, BOOK_ID, CHAPTER, VERSE_START, VERSE_END, TEXT) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)", batch)
        conn.commit()
        total += len(batch)
    
    print(f"\n  TOTAL: {total} entries")
    return total

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=r"C:\\Users\\PC\\.qclaw\\workspace-v733kxt9elzfv7u1\\bible-microservices\\data\\text-db")
    parser.add_argument("--h2-jar", default=r"C:\\Users\\PC\\.qclaw\\workspace-v733kxt9elzfv7u1\\bible-microservices\\scripts\\h2-2.2.224.jar")
    parser.add_argument("--import", action="store_true")
    args = parser.parse_args()
    
    if not args.__dict__.get('import'):
        import_wesley(None, dry=True)
    else:
        url = f"jdbc:h2:file:{args.db};AUTO_SERVER=TRUE"
        conn = jaydebeapi.connect("org.h2.Driver", url, ["sa", ""], args.h2_jar)
        conn.jconn.setAutoCommit(False)
        import_wesley(conn)
        conn.close()
        print("\nDONE. Restart text-service.")

if __name__ == '__main__':
    main()
