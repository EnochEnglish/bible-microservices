"""Import OSHB (Open Scriptures Hebrew Bible) into H2 database."""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import jaydebeapi
from lxml import etree

# --- Config ---
WLC_DIR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\node_modules\morphhb\wlc"
H2_JAR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar"
DB_PATH = r"C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db"
NS = "http://www.bibletechnologies.net/2003/OSIS/namespace"

# Book mapping: XML filename -> (project_book_id, book_name, chapter_count)
BOOK_FILES = [
    ("Gen.xml",    ("gen",  "Genesis", 50)),
    ("Exod.xml",   ("exo",  "Exodus", 40)),
    ("Lev.xml",    ("lev",  "Leviticus", 27)),
    ("Num.xml",    ("num",  "Numbers", 36)),
    ("Deut.xml",   ("deu",  "Deuteronomy", 34)),
    ("Josh.xml",   ("jos",  "Joshua", 24)),
    ("Judg.xml",   ("jdg",  "Judges", 21)),
    ("Ruth.xml",   ("rut",  "Ruth", 4)),
    ("1Sam.xml",   ("1sa",  "1 Samuel", 31)),
    ("2Sam.xml",   ("2sa",  "2 Samuel", 24)),
    ("1Kgs.xml",   ("1ki",  "1 Kings", 22)),
    ("2Kgs.xml",   ("2ki",  "2 Kings", 25)),
    ("1Chr.xml",   ("1ch",  "1 Chronicles", 29)),
    ("2Chr.xml",   ("2ch",  "2 Chronicles", 36)),
    ("Ezra.xml",   ("ezr",  "Ezra", 10)),
    ("Neh.xml",    ("neh",  "Nehemiah", 13)),
    ("Esth.xml",   ("est",  "Esther", 10)),
    ("Job.xml",    ("job",  "Job", 42)),
    ("Ps.xml",     ("psa",  "Psalms", 150)),
    ("Prov.xml",   ("pro",  "Proverbs", 31)),
    ("Eccl.xml",   ("ecc",  "Ecclesiastes", 12)),
    ("Song.xml",   ("sng",  "Song of Solomon", 8)),
    ("Isa.xml",    ("isa",  "Isaiah", 66)),
    ("Jer.xml",    ("jer",  "Jeremiah", 52)),
    ("Lam.xml",    ("lam",  "Lamentations", 5)),
    ("Ezek.xml",   ("ezk",  "Ezekiel", 48)),
    ("Dan.xml",    ("dan",  "Daniel", 12)),
    ("Hos.xml",    ("hos",  "Hosea", 14)),
    ("Joel.xml",   ("jol",  "Joel", 3)),
    ("Amos.xml",   ("amo",  "Amos", 9)),
    ("Obad.xml",   ("oba",  "Obadiah", 1)),
    ("Jonah.xml",  ("jon",  "Jonah", 4)),
    ("Mic.xml",    ("mic",  "Micah", 7)),
    ("Nah.xml",    ("nam",  "Nahum", 3)),
    ("Hab.xml",    ("hab",  "Habakkuk", 3)),
    ("Zeph.xml",   ("zep",  "Zephaniah", 3)),
    ("Hag.xml",    ("hag",  "Haggai", 2)),
    ("Zech.xml",   ("zec",  "Zechariah", 14)),
    ("Mal.xml",    ("mal",  "Malachi", 4)),
]

def main():
    print("Connecting to H2...")
    conn = jaydebeapi.connect(
        "org.h2.Driver",
        f"jdbc:h2:file:{DB_PATH}",
        ["sa", ""],
        H2_JAR
    )
    conn.jconn.setAutoCommit(False)
    cur = conn.cursor()

    # Check existing translations
    cur.execute("SELECT ID, CODE FROM TRANSLATIONS WHERE CODE='oshb'")
    existing = cur.fetchone()
    if existing:
        tid = existing[0]
        print(f"Removing existing OSHB (ID={tid})...")
        cur.execute("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID=?)", (tid,))
        cur.execute("DELETE FROM BOOKS WHERE TRANSLATION_ID=?", (tid,))
        conn.commit()
    else:
        cur.execute(
            "INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE, ABBREVIATION, IS_ACTIVE) VALUES (?,?,?,?,?)",
            ("oshb", "Open Scriptures Hebrew Bible", "hbo", "OSHB", True)
        )
        conn.commit()
        cur.execute("SELECT ID FROM TRANSLATIONS WHERE CODE=?", ("oshb",))
        tid = cur.fetchone()[0]
        print(f"Created OSHB (ID={tid})")

    total_verses = 0
    book_count = 0

    for idx, (xml_file, (book_id, book_name, chapters)) in enumerate(BOOK_FILES):
        xml_path = os.path.join(WLC_DIR, xml_file)
        if not os.path.exists(xml_path):
            print(f"  SKIP {xml_file}: not found")
            continue

        tree = etree.parse(xml_path)
        root = tree.getroot()

        # Collect verses: [(chapter, verse, text, verse_key)]
        verses = []
        for ve in root.iter(f"{{{NS}}}verse"):
            osis_id = ve.get("osisID", "")
            parts = osis_id.split(".")
            if len(parts) < 3:
                continue
            ch = int(parts[1])
            vs = int(parts[2])
            text = " ".join(ve.itertext()).strip()
            if not text:
                continue
            vk = f"{book_id}.{ch}.{vs}"
            verses.append((ch, vs, text, vk))

        if not verses:
            print(f"  SKIP {book_id}: no verses")
            continue

        actual_chapter_count = max(v[0] for v in verses)
        if actual_chapter_count > chapters:
            chapters = actual_chapter_count

        # Insert book
        cur.execute(
            "INSERT INTO BOOKS (TRANSLATION_ID, BOOK_ID, NAME, ENGLISH_NAME, OSIS_ID, ORDER_INDEX, CHAPTER_COUNT) "
            "VALUES (?,?,?,?,?,?,?)",
            (tid, book_id, book_name, book_name, book_id, idx, chapters)
        )
        conn.commit()

        cur.execute("SELECT ID FROM BOOKS WHERE TRANSLATION_ID=? AND BOOK_ID=?", (tid, book_id))
        bk_row = cur.fetchone()
        if not bk_row:
            print(f"  FAIL {book_id}: book insert failed")
            continue
        bk_db_id = bk_row[0]

        # Batch insert verses
        rows = [(bk_db_id, ch, vs, txt, vk) for ch, vs, txt, vk in verses]
        chunk = 500
        for i in range(0, len(rows), chunk):
            batch = rows[i:i+chunk]
            cur.executemany(
                "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT, VERSE_KEY) VALUES (?,?,?,?,?)",
                batch
            )
            conn.commit()
            print(f"\r  [{book_id}] {min(i+chunk, len(rows))}/{len(rows)} verses", end=" ")

        print(f"\r  [{book_id}] {len(rows)} verses, {chapters} chapters     ")
        total_verses += len(rows)
        book_count += 1

    print(f"\nDone! {book_count} books, {total_verses} verses")
    conn.close()

if __name__ == "__main__":
    main()