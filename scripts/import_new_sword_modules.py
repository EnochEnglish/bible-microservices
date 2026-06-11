#!/usr/bin/env python3
"""
Import 9 new SWORD Bible translation modules into H2 database.
Uses pysword for reading + jaydebeapi for H2 writes.
"""
import sys, os, re, time, argparse
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from pysword.modules import SwordModules
import jaydebeapi

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
    # Apocrypha
    "I Esdras": "1es", "II Esdras": "2es", "Tobit": "tob", "Judith": "jdt",
    "Additions to Esther": "ade", "Wisdom": "wis", "Sirach": "sir",
    "Baruch": "bar", "Epistle of Jeremiah": "lje", "Prayer of Azariah": "aza",
    "Susanna": "sus", "Bel and the Dragon": "bel", "I Maccabees": "1ma",
    "II Maccabees": "2ma", "III Maccabees": "3ma", "IV Maccabees": "4ma",
    "Prayer of Manasseh": "man", "Prayer of Manasses": "man",
    "Odes": "ode", "Psalms of Solomon": "pss",
    "Additional Psalm": "aps", "Laodiceans": "lao",
    # NT
    "Matthew": "mat", "Mark": "mrk", "Luke": "luk", "John": "jhn",
    "Acts": "act", "Romans": "rom", "I Corinthians": "1co",
    "II Corinthians": "2co", "Galatians": "gal", "Ephesians": "eph",
    "Philippians": "php", "Colossians": "col", "I Thessalonians": "1th",
    "II Thessalonians": "2th", "I Timothy": "1ti", "II Timothy": "2ti",
    "Titus": "tit", "Philemon": "phm", "Hebrews": "heb", "James": "jas",
    "I Peter": "1pe", "II Peter": "2pe", "I John": "1jn", "II John": "2jn",
    "III John": "3jn", "Jude": "jud", "Revelation": "rev", "Revelation of John": "rev",
}

MODULES = {
    "tr":       {"dir": "TR",       "name": "Textus Receptus (1550/1894)",       "lang": "grc"},
    "sblgnt":   {"dir": "SBLGNT",   "name": "SBL Greek New Testament",         "lang": "grc"},
    "morphgnt": {"dir": "MorphGNT", "name": "Morphologically Parsed GNT",       "lang": "grc"},
    "sp":       {"dir": "SP",       "name": "Samaritan Pentateuch",             "lang": "hbo"},
    "bsb":      {"dir": "BSB",      "name": "Berean Standard Bible",            "lang": "en"},
    "geneva1599": {"dir": "Geneva1599", "name": "Geneva Bible (1599)",        "lang": "en"},
    "drc":      {"dir": "DRC",      "name": "Douay-Rheims Bible (Challoner)",  "lang": "en"},
    "chincvs":  {"dir": "ChiNCVs",  "name": "Chinese New Version (u65b0u8bd1u672c)", "lang": "zh"},
    "russynodal": {"dir": "RusSynodal", "name": "Russian Synodal Bible",        "lang": "ru"},
}

def clean_verse_text(text):
    text = str(text)
    if "<" in text:
        text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def import_module(conn, trans_code, cfg, sword_base):
    print(f"\\n{'='*70}")
    print(f"Importing: {cfg['name']} ({trans_code})")
    t0 = time.time()

    mod_path = os.path.join(sword_base, cfg["dir"])
    modules = SwordModules(mod_path)
    modules.parse_modules()
    bible = modules.get_bible_from_module(cfg["dir"])
    structure = bible.get_structure()
    books_dict = structure.get_books()

    all_books = books_dict.get("ot", []) + books_dict.get("nt", [])
    print(f"  Total books in module: {len(all_books)}")

    book_mapping = {}
    unmapped = []
    for bk in all_books:
        book_id = SWORD_TO_ID.get(bk.name)
        if not book_id:
            unmapped.append(bk.name)
            continue
        book_mapping[bk.name] = (book_id, bk)

    if unmapped:
        print(f"  WARNING unmapped books: {unmapped}")
    print(f"  Mapped books: {len(book_mapping)}")

    # Delete existing data
    cur = conn.cursor()
    cur.execute("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID IN (SELECT ID FROM TRANSLATIONS WHERE CODE = ?))", (trans_code,))
    cur.execute("DELETE FROM BOOKS WHERE TRANSLATION_ID IN (SELECT ID FROM TRANSLATIONS WHERE CODE = ?)", (trans_code,))
    cur.execute("DELETE FROM TRANSLATIONS WHERE CODE = ?", (trans_code,))
    conn.commit()

    # Insert translation
    cur.execute(
        "INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE, IS_ACTIVE) VALUES (?, ?, ?, TRUE)",
        (trans_code, cfg["name"], cfg["lang"])
    )
    conn.commit()
    cur.execute("SELECT ID FROM TRANSLATIONS WHERE CODE = ?", (trans_code,))
    trans_db_id = cur.fetchone()[0]
    print(f"  Translation DB ID: {trans_db_id}")

    CHUNK = 500
    total_verses = 0
    verse_batch = []

    for sword_name, (book_id, bk_obj) in sorted(book_mapping.items()):
        num_ch = bk_obj.num_chapters
        if num_ch == 0 or bk_obj.size == 0:
            continue

        english_name = bk_obj.name
        osis_id = bk_obj.osis_name.lower() if bk_obj.osis_name else book_id
        order_idx = BOOK_ORDER_INDEX.get(book_id, 999)

        chapter_verse_counts = {}
        actual_chapters = 0
        for ch_idx, vcount in enumerate(bk_obj.chapter_lengths):
            ch_num = ch_idx + 1
            if vcount > 0:
                chapter_verse_counts[ch_num] = vcount
                actual_chapters += 1

        if actual_chapters == 0:
            continue

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
                    pass  # skip empty verses silently

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
            print(f"  {book_id} ({sword_name}): {actual_chapters}ch x {book_verses}v")

    elapsed = time.time() - t0
    print(f"  TOTAL: {total_verses} verses in {elapsed:.1f}s ({total_verses/max(1,elapsed):.0f} v/s)")
    return total_verses

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=r"C:\\Users\\PC\\.qclaw\\workspace-v733kxt9elzfv7u1\\bible-microservices\\data\\text-db")
    parser.add_argument("--sword-base", default=r"C:\\Users\\PC\\.qclaw\\workspace-v733kxt9elzfv7u1\\bible-microservices\\data\\sword-mods")
    parser.add_argument("--h2-jar", default=r"C:\\Users\\PC\\.qclaw\\workspace-v733kxt9elzfv7u1\\bible-microservices\\scripts\\h2-2.2.224.jar")
    parser.add_argument("--modules", default="all")
    args = parser.parse_args()

    url = f"jdbc:h2:file:{args.db};AUTO_SERVER=TRUE"
    conn = jaydebeapi.connect("org.h2.Driver", url, ["sa", ""], args.h2_jar)
    conn.jconn.setAutoCommit(False)
    print(f"Connected: {url}")

    if args.modules == "all":
        mod_list = list(MODULES.keys())
    else:
        mod_list = [m.strip() for m in args.modules.split(",")]

    grand_total = 0
    for mod_key in mod_list:
        if mod_key not in MODULES:
            print(f"Unknown module: {mod_key}")
            continue
        grand_total += import_module(conn, mod_key, MODULES[mod_key], args.sword_base)

    conn.close()
    print(f"\\n{'='*70}")
    print(f"ALL DONE. Total verses imported: {grand_total:,}")
    print("Now restart text-service and build search indexes.")

if __name__ == "__main__":
    main()