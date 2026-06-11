#!/usr/bin/env python3
"""
Import Greek/Latin Bibles from SWORD modules into H2 database
Using pysword to read modules, JDBC to write to H2
"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

from pysword.modules import SwordModules
import jaydebeapi
import argparse

# Map SWORD book names to our standard IDs (matching BOOK_ORDER in app.js)
SWORD_TO_ID = {
    # OT
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM",
    "Deuteronomy": "DEU", "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
    "I Samuel": "1SA", "II Samuel": "2SA", "I Kings": "1KI", "II Kings": "2KI",
    "I Chronicles": "1CH", "II Chronicles": "2CH", "Ezra": "EZR", "Nehemiah": "NEH",
    "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
    "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA",
    "Jeremiah": "JER", "Lamentations": "LAM", "Ezekiel": "EZK",
    "Daniel": "DAN", "Hosea": "HOS", "Joel": "JOL", "Amos": "AMO",
    "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM",
    "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG",
    "Zechariah": "ZEC", "Malachi": "MAL",
    # Apocrypha / LXX extras
    "I Esdras": "1ES", "II Esdras": "2ES", "Tobit": "TOB", "Judith": "JDT",
    "Additions to Esther": "ADE", "Wisdom": "WIS", "Sirach": "SIR",
    "Baruch": "BAR", "Epistle of Jeremiah": "LJE", "Prayer of Azariah": "AZA",
    "Susanna": "SUS", "Bel and the Dragon": "BEL", "I Maccabees": "1MA",
    "II Maccabees": "2MA", "III Maccabees": "3MA", "IV Maccabees": "4MA",
    "Prayer of Manasseh": "MAN", "Odes": "ODE", "Psalms of Solomon": "PSS",
    # LXX variants
    "Prayer of Manasses": "MAN", "I Enoch": "ENO", "Revelation of John": "REV",
    # NT
    "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
    "Acts": "ACT", "Romans": "ROM", "I Corinthians": "1CO",
    "II Corinthians": "2CO", "Galatians": "GAL", "Ephesians": "EPH",
    "Philippians": "PHP", "Colossians": "COL", "I Thessalonians": "1TH",
    "II Thessalonians": "2TH", "I Timothy": "1TI", "II Timothy": "2TI",
    "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB", "James": "JAS",
    "I Peter": "1PE", "II Peter": "2PE", "I John": "1JN", "II John": "2JN",
    "III John": "3JN", "Jude": "JUD", "Revelation": "REV",
}

# Vulgate uses Latin names sometimes
LATIN_TO_ID = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numeri": "NUM",
    "Deuteronomium": "DEU", "Iosue": "JOS", "Iudicum": "JDG", "Ruth": "RUT",
    "I Samuelis": "1SA", "II Samuelis": "2SA", "I Regum": "1KI", "II Regum": "2KI",
    "I Paralipomenon": "1CH", "II Paralipomenon": "2CH", "Esdrae": "EZR",
    "Nehemiae": "NEH", "Tobiae": "TOB", "Iudith": "JDT", "Esther": "EST",
    "Iob": "JOB", "Psalmi": "PSA", "Proverbia": "PRO", "Ecclesiastes": "ECC",
    "Canticum Canticorum": "SNG", "Sapientia": "WIS", "Ecclesiasticus": "SIR",
    "Isaias": "ISA", "Ieremias": "JER", "Lamentationes": "LAM", "Baruch": "BAR",
    "Ezechiel": "EZK", "Daniel": "DAN", "Osee": "HOS", "Ioel": "JOL",
    "Amos": "AMO", "Abdias": "OBA", "Ionas": "JON", "Michaeas": "MIC",
    "Nahum": "NAM", "Habacuc": "HAB", "Sophonias": "ZEP", "Aggaeus": "HAG",
    "Zacharias": "ZEC", "Malachias": "MAL", "I Maccabaeorum": "1MA",
    "II Maccabaeorum": "2MA",
    # NT
    "Matthaeus": "MAT", "Marcus": "MRK", "Lucas": "LUK", "Ioannes": "JHN",
    "Actus": "ACT", "Ad Romanos": "ROM", "I Ad Corinthios": "1CO",
    "II Ad Corinthios": "2CO", "Ad Galatas": "GAL", "Ad Ephesios": "EPH",
    "Ad Philippenses": "PHP", "Ad Colossenses": "COL",
    "I Ad Thessalonicenses": "1TH", "II Ad Thessalonicenses": "2TH",
    "I Ad Timotheum": "1TI", "II Ad Timotheum": "2TI",
    "Ad Titum": "TIT", "Ad Philemonem": "PHM", "Ad Hebraeos": "HEB",
    "Iacobi": "JAS", "I Petri": "1PE", "II Petri": "2PE",
    "I Ioannis": "1JN", "II Ioannis": "2JN", "III Ioannis": "3JN",
    "Iudae": "JUD", "Apocalypsis": "REV",
}

# Merge Vulgate Latin names into main map
SWORD_TO_ID.update(LATIN_TO_ID)

MODULE_CONFIG = {
    "lxx": {"name": "Septuagint (LXX)", "lang": "grc", "sword_name": "LXX", "sword_dir": "LXX"},
    "byz": {"name": "Byzantine Greek NT", "lang": "grc", "sword_name": "Byz", "sword_dir": "Byz"},
    "vulgate": {"name": "Latin Vulgate", "lang": "la", "sword_name": "Vulgate", "sword_dir": "Vulgate"},
}

def import_module(conn, cfg, sword_base):
    """Import one SWORD module into the database"""
    trans_id = cfg["sword_name"].lower().replace("(", "").replace(")", "").replace(" ", "_")
    sword_dir = cfg["sword_dir"]
    
    print(f"\n{'='*60}")
    print(f"Importing: {cfg['name']} ({trans_id}, lang={cfg['lang']})")
    
    # Load SWORD module
    mod_path = os.path.join(sword_base, sword_dir)
    modules = SwordModules(mod_path)
    modules.parse_modules()
    bible = modules.get_bible_from_module(cfg["sword_name"])
    structure = bible.get_structure()
    books_dict = structure.get_books()
    
    # Collect all books from OT and NT
    all_books = books_dict.get("ot", []) + books_dict.get("nt", [])
    print(f"  Total SWORD books: {len(all_books)}")
    
    # Map books to our IDs (use .name attribute, not str())
    book_mapping = {}
    mapped = 0
    for book_obj in all_books:
        sword_name = book_obj.name
        book_id = SWORD_TO_ID.get(sword_name)
        if book_id:
            book_mapping[sword_name] = book_id
            mapped += 1
        else:
            # Try fuzzy match
            sword_lower = sword_name.lower().replace(" ", "")
            for k, v in SWORD_TO_ID.items():
                if k.lower().replace(" ", "") == sword_lower:
                    book_mapping[sword_name] = v
                    mapped += 1
                    break
            else:
                print(f"  UNMAPPED: {sword_name}")
    
    print(f"  Mapped {mapped}/{len(all_books)} books")
    
    # Check if translation already exists
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM TRANSLATIONS WHERE CODE = ?", (trans_id,))
    if cur.fetchone()[0] > 0:
        print(f"  Translation {trans_id} already exists, deleting old data...")
        cur.execute("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID = (SELECT ID FROM TRANSLATIONS WHERE CODE = ?))", (trans_id,))
        cur.execute("DELETE FROM BOOKS WHERE TRANSLATION_ID = (SELECT ID FROM TRANSLATIONS WHERE CODE = ?)", (trans_id,))
        cur.execute("DELETE FROM TRANSLATIONS WHERE CODE = ?", (trans_id,))
        conn.commit()
    
    # Insert translation
    cur.execute(
        "INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE) VALUES (?, ?, ?)",
        (trans_id, cfg["name"], cfg["lang"])
    )
    conn.commit()
    # Get the generated ID by querying back
    cur.execute("SELECT ID FROM TRANSLATIONS WHERE CODE = ?", (trans_id,))
    trans_db_id = cur.fetchone()[0]
    print(f"  Translation ID: {trans_db_id}")
    conn.commit()
    
    # Now iterate all books and import verses
    CHUNK_SIZE = 500
    total_verses = 0
    
    verse_batch = []
    
    for sword_name, book_id in book_mapping.items():
        try:
            # Count chapters
            chapter_num = 1
            max_chapters = 0
            while True:
                try:
                    test = bible.get(sword_name, chapter_num, 1)
                    if test and not str(test).startswith("ERROR"):
                        max_chapters = chapter_num
                        chapter_num += 1
                    else:
                        break
                except:
                    break
                if chapter_num > 200:  # safety limit
                    break
            
            if max_chapters == 0:
                print(f"  SKIP {book_id} ({sword_name}): no chapters found")
                continue
            
            # Insert book
            cur.execute(
                "INSERT INTO BOOKS (TRANSLATION_ID, BOOK_ID, NAME, CHAPTER_COUNT) VALUES (?, ?, ?, ?)",
                (trans_db_id, book_id, sword_name, max_chapters)
            )
            conn.commit()
            # Get the generated book ID
            cur.execute("SELECT ID FROM BOOKS WHERE TRANSLATION_ID = ? AND BOOK_ID = ?", (trans_db_id, book_id))
            book_db_id = cur.fetchone()[0]
            
            # Import chapters
            book_verses = 0
            for ch in range(1, max_chapters + 1):
                verse_num = 1
                while True:
                    try:
                        text = bible.get(sword_name, ch, verse_num)
                        if text and not str(text).startswith("ERROR"):
                            # Clean text: strip XML tags
                            text = str(text)
                            if text.startswith("<") or "<" in text:
                                text = re.sub(r'<[^>]+>', '', text)
                            text = text.strip()
                            if text:
                                verse_batch.append((book_db_id, ch, verse_num, text))
                                if len(verse_batch) >= CHUNK_SIZE:
                                    cur.executemany(
                                        "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT) VALUES (?, ?, ?, ?)",
                                        verse_batch
                                    )
                                    conn.commit()
                                    book_verses += len(verse_batch)
                                    total_verses += len(verse_batch)
                                    verse_batch = []
                            verse_num += 1
                        else:
                            break
                    except:
                        break
                    if verse_num > 300:  # safety
                        break
            
            # Flush remaining
            if verse_batch:
                cur.executemany(
                    "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT) VALUES (?, ?, ?, ?)",
                    verse_batch
                )
                conn.commit()
                book_verses += len(verse_batch)
                total_verses += len(verse_batch)
                verse_batch = []
            
            print(f"  {book_id} ({sword_name}): {max_chapters} chapters, {book_verses} verses")
            
        except Exception as e:
            print(f"  ERROR {sword_name}: {e}")
    
    print(f"  TOTAL VERSES IMPORTED: {total_verses}")
    conn.commit()
    return total_verses

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\text-db")
    parser.add_argument("--sword-base", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods")
    parser.add_argument("--modules", default="lxx,byz,vulgate")
    parser.add_argument("--h2-jar", default=r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\h2-2.2.224.jar")
    args = parser.parse_args()
    
    jdbc_url = f"jdbc:h2:file:{args.db};AUTO_SERVER=TRUE"
    
    # Connect to H2
    conn = jaydebeapi.connect(
        "org.h2.Driver",
        jdbc_url,
        ["sa", ""],
        args.h2_jar
    )
    conn.jconn.setAutoCommit(False)
    
    print(f"Connected to: {jdbc_url}")
    
    modules_to_import = [m.strip() for m in args.modules.split(",")]
    
    for mod_key in modules_to_import:
        if mod_key not in MODULE_CONFIG:
            print(f"Unknown module: {mod_key}")
            continue
        cfg = MODULE_CONFIG[mod_key]
        
        # Need to stop text-service first (DB lock)
        print(f"\n!!! STOP text-service before importing (DB lock) !!!")
        print(f"Ready to import {cfg['name']}. Press Ctrl+C to abort, or continue in 5s...")
        
        import_module(conn, cfg, args.sword_base)
    
    conn.close()
    print("\nDone! Restart text-service.")

if __name__ == "__main__":
    main()
