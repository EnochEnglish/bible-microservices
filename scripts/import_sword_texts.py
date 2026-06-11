#!/usr/bin/env python3
"""
Import Greek/Latin Bibles from SWORD modules into H2 database.
Uses pysword for reading + jaydebeapi for H2 writes.
"""
import sys, os, re, time, argparse
sys.stdout.reconfigure(encoding='utf-8')

from pysword.modules import SwordModules
import jaydebeapi

# BOOK_ORDER from app.js - used to set ORDER_INDEX
BOOK_ORDER = [
    "gen", "exo", "lev", "num", "deu", "jos", "jdg", "rut", "1sa", "2sa",
    "1ki", "2ki", "1ch", "2ch", "ezr", "neh", "est", "job", "psa", "pro",
    "ecc", "sng", "isa", "jer", "lam", "ezk", "dan", "hos", "jol", "amo",
    "oba", "jon", "mic", "nam", "hab", "zep", "hag", "zec", "mal",
    "mat", "mrk", "luk", "jhn", "act", "rom", "1co", "2co", "gal", "eph",
    "php", "col", "1th", "2th", "1ti", "2ti", "tit", "phm", "heb", "jas",
    "1pe", "2pe", "1jn", "2jn", "3jn", "jud", "rev",
]

BOOK_ORDER_INDEX = {bid: i + 1 for i, bid in enumerate(BOOK_ORDER)}

# Map SWORD book names → our lowercase IDs
SWORD_TO_ID = {
    # OT
    "Genesis": "gen", "Exodus": "exo", "Leviticus": "lev", "Numbers": "num",
    "Deuteronomy": "deu", "Joshua": "jos", "Judges": "jdg", "Ruth": "rut",
    "I Samuel": "1sa", "II Samuel": "2sa", "I Kings": "1ki", "II Kings": "2ki",
    "I Chronicles": "1ch", "II Chronicles": "2ch", "Ezra": "ezr", "Nehemiah": "neh",
    "Esther": "est", "Job": "job", "Psalms": "psa", "Proverbs": "pro",
    "Ecclesiastes": "ecc", "Song of Solomon": "sng", "Isaiah": "isa",
    "Jeremiah": "jer", "Lamentations": "lam", "Ezekiel": "ezk",
    "Daniel": "dan", "Hosea": "hos", "Joel": "jol", "Amos": "amo",
    "Obadiah": "oba", "Jonah": "jon", "Micah": "mic", "Nahum": "nam",
    "Habakkuk": "hab", "Zephaniah": "zep", "Haggai": "hag",
    "Zechariah": "zec", "Malachi": "mal",
    # LXX Apocrypha
    "I Esdras": "1es", "II Esdras": "2es", "Tobit": "tob", "Judith": "jdt",
    "Additions to Esther": "ade", "Wisdom": "wis", "Sirach": "sir",
    "Baruch": "bar", "Epistle of Jeremiah": "lje", "Prayer of Azariah": "aza",
    "Susanna": "sus", "Bel and the Dragon": "bel", "I Maccabees": "1ma",
    "II Maccabees": "2ma", "III Maccabees": "3ma", "IV Maccabees": "4ma",
    "Prayer of Manasseh": "man", "Prayer of Manasses": "man",
    "Odes": "ode", "Psalms of Solomon": "pss", "I Enoch": "eno",
    # NT
    "Matthew": "mat", "Mark": "mrk", "Luke": "luk", "John": "jhn",
    "Acts": "act", "Romans": "rom", "I Corinthians": "1co",
    "II Corinthians": "2co", "Galatians": "gal", "Ephesians": "eph",
    "Philippians": "php", "Colossians": "col", "I Thessalonians": "1th",
    "II Thessalonians": "2th", "I Timothy": "1ti", "II Timothy": "2ti",
    "Titus": "tit", "Philemon": "phm", "Hebrews": "heb", "James": "jas",
    "I Peter": "1pe", "II Peter": "2pe", "I John": "1jn", "II John": "2jn",
    "III John": "3jn", "Jude": "jud", "Revelation": "rev", "Revelation of John": "rev",
    # Vulgate Latin book names (pysword normalizes to English, but just in case)
    "Numeri": "num", "Deuteronomium": "deu", "Iosue": "jos", "Iudicum": "jdg",
    "I Samuelis": "1sa", "II Samuelis": "2sa", "I Regum": "1ki", "II Regum": "2ki",
    "I Paralipomenon": "1ch", "II Paralipomenon": "2ch", "Esdrae": "ezr",
    "Nehemiae": "neh", "Tobiae": "tob", "Iudith": "jdt",
    "Iob": "job", "Psalmi": "psa", "Proverbia": "pro",
    "Canticum Canticorum": "sng", "Sapientia": "wis", "Ecclesiasticus": "sir",
    "Isaias": "isa", "Ieremias": "jer", "Lamentationes": "lam",
    "Ezechiel": "ezk", "Osee": "hos", "Ioel": "jol",
    "Abdias": "oba", "Ionas": "jon", "Michaeas": "mic",
    "Habacuc": "hab", "Sophonias": "zep", "Aggaeus": "hag",
    "Zacharias": "zec", "Malachias": "mal", "I Maccabaeorum": "1ma",
    "II Maccabaeorum": "2ma",
    "Matthaeus": "mat", "Marcus": "mrk", "Lucas": "luk", "Ioannes": "jhn",
    "Actus": "act", "Ad Romanos": "rom", "I Ad Corinthios": "1co",
    "II Ad Corinthios": "2co", "Ad Galatas": "gal", "Ad Ephesios": "eph",
    "Ad Philippenses": "php", "Ad Colossenses": "col",
    "I Ad Thessalonicenses": "1th", "II Ad Thessalonicenses": "2th",
    "I Ad Timotheum": "1ti", "II Ad Timotheum": "2ti",
    "Ad Titum": "tit", "Ad Philemonem": "phm", "Ad Hebraeos": "heb",
    "Iacobi": "jas", "I Petri": "1pe", "II Petri": "2pe",
    "I Ioannis": "1jn", "II Ioannis": "2jn", "III Ioannis": "3jn",
    "Iudae": "jud", "Apocalypsis": "rev",
    "Additional Psalm": "aps", "Laodiceans": "lao",
}

MODULES = {
    "lxx": {"name": "Septuagint (LXX)", "lang": "grc", "sword_name": "LXX", "sword_dir": "LXX"},
    "byz": {"name": "Byzantine Greek NT", "lang": "grc", "sword_name": "Byz", "sword_dir": "Byz"},
    "vulgate": {"name": "Latin Vulgate", "lang": "la", "sword_name": "Vulgate", "sword_dir": "Vulgate"},
}

def clean_verse_text(text):
    """Remove OSIS XML tags from verse text"""
    text = str(text)
    if "<" in text:
        # Remove all XML tags but keep their content
        text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def import_module(conn, cfg, sword_base):
    trans_code = cfg["sword_name"].lower()
    print(f"\n{'='*70}")
    print(f"Importing: {cfg['name']} ({trans_code})")
    t0 = time.time()

    # Load SWORD module
    mod_path = os.path.join(sword_base, cfg["sword_dir"])
    modules = SwordModules(mod_path)
    modules.parse_modules()
    bible = modules.get_bible_from_module(cfg["sword_name"])
    structure = bible.get_structure()
    books_dict = structure.get_books()

    all_books = books_dict.get("ot", []) + books_dict.get("nt", [])
    print(f"  Books in module: {len(all_books)}")

    # Map books to IDs, filter to those with data
    book_mapping = {}  # sword_name -> (book_id, book_obj)
    unmapped = []
    for bk in all_books:
        book_id = SWORD_TO_ID.get(bk.name)
        if not book_id:
            unmapped.append(bk.name)
            continue
        book_mapping[bk.name] = (book_id, bk)

    if unmapped:
        print(f"  Unmapped: {unmapped}")
    print(f"  Mapped: {len(book_mapping)}")

    # Delete existing data
    cur = conn.cursor()
    cur.execute("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID IN (SELECT ID FROM TRANSLATIONS WHERE CODE = ?))", (trans_code,))
    cur.execute("DELETE FROM BOOKS WHERE TRANSLATION_ID IN (SELECT ID FROM TRANSLATIONS WHERE CODE = ?)", (trans_code,))
    cur.execute("DELETE FROM TRANSLATIONS WHERE CODE = ?", (trans_code,))
    conn.commit()

    # Insert translation (include IS_ACTIVE)
    cur.execute(
        "INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE, IS_ACTIVE) VALUES (?, ?, ?, TRUE)",
        (trans_code, cfg["name"], cfg["lang"])
    )
    conn.commit()
    cur.execute("SELECT ID FROM TRANSLATIONS WHERE CODE = ?", (trans_code,))
    trans_db_id = cur.fetchone()[0]
    print(f"  Translation DB ID: {trans_db_id}")

    # Import books
    CHUNK = 500
    total_verses = 0
    verse_batch = []

    for sword_name, (book_id, bk_obj) in sorted(book_mapping.items()):
        num_ch = bk_obj.num_chapters
        if num_ch == 0 or bk_obj.size == 0:
            continue  # no data for this book

        english_name = bk_obj.name
        osis_id = bk_obj.osis_name.lower() if bk_obj.osis_name else book_id
        order_idx = BOOK_ORDER_INDEX.get(book_id, 999)

        # Get actual chapter count and verse counts
        chapter_verse_counts = {}
        actual_chapters = 0
        for ch_idx, vcount in enumerate(bk_obj.chapter_lengths):
            ch_num = ch_idx + 1
            if vcount > 0:
                chapter_verse_counts[ch_num] = vcount
                actual_chapters += 1

        if actual_chapters == 0:
            continue

        # Insert book row
        cur.execute(
            "INSERT INTO BOOKS (TRANSLATION_ID, BOOK_ID, NAME, ENGLISH_NAME, OSIS_ID, ORDER_INDEX, CHAPTER_COUNT) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (trans_db_id, book_id, english_name, english_name, osis_id, order_idx, actual_chapters)
        )
        conn.commit()
        cur.execute(
            "SELECT ID FROM BOOKS WHERE TRANSLATION_ID = ? AND BOOK_ID = ?",
            (trans_db_id, book_id)
        )
        book_db_id = cur.fetchone()[0]

        book_verses = 0
        for ch_num, vcount in sorted(chapter_verse_counts.items()):
            for vnum in range(1, vcount + 1):
                try:
                    raw = bible.get(sword_name, ch_num, vnum)
                    if raw:
                        text = clean_verse_text(raw)
                        if text:
                            vkey = f"{book_id}.{ch_num}.{vnum}"
                            verse_batch.append((book_db_id, ch_num, vnum, text, vkey))
                            if len(verse_batch) >= CHUNK:
                                cur.executemany(
                                    "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT, VERSE_KEY) VALUES (?, ?, ?, ?, ?)",
                                    verse_batch
                                )
                                conn.commit()
                                book_verses += len(verse_batch)
                                total_verses += len(verse_batch)
                                verse_batch = []
                except Exception as e:
                    print(f"    ERROR {sword_name} {ch_num}:{vnum}: {e}")

        # Flush book batch
        if verse_batch:
            cur.executemany(
                "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT, VERSE_KEY) VALUES (?, ?, ?, ?, ?)",
                verse_batch
            )
            conn.commit()
            book_verses += len(verse_batch)
            total_verses += len(verse_batch)
            verse_batch = []

        if book_verses > 0:
            print(f"  {book_id} ({sword_name}): {actual_chapters}ch × {book_verses}v")

    elapsed = time.time() - t0
    print(f"  TOTAL: {total_verses} verses in {elapsed:.1f}s ({total_verses / elapsed:.0f} v/s)")
    return total_verses

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\text-db")
    parser.add_argument("--sword-base", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods")
    parser.add_argument("--h2-jar", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar")
    parser.add_argument("--modules", default="lxx,byz,vulgate")
    args = parser.parse_args()

    url = f"jdbc:h2:file:{args.db};AUTO_SERVER=TRUE"
    conn = jaydebeapi.connect("org.h2.Driver", url, ["sa", ""], args.h2_jar)
    conn.jconn.setAutoCommit(False)
    print(f"Connected: {url}")

    mod_list = [m.strip() for m in args.modules.split(",")]
    grand_total = 0
    for mod_key in mod_list:
        if mod_key not in MODULES:
            print(f"Unknown module: {mod_key}")
            continue
        grand_total += import_module(conn, MODULES[mod_key], args.sword_base)

    conn.close()
    print(f"\n{'='*70}")
    print(f"ALL DONE. Total verses: {grand_total}")
    print("Now restart text-service and build search indexes.")

if __name__ == "__main__":
    main()