#!/usr/bin/env python3
"""
Import Bible data from MySQL SQL dumps into H2 database.
Fast version: pre-compute all IDs, use direct INSERTs (no subqueries).
"""
import re, os, sys, subprocess, shutil

# ─── Configuration ───
DATA_DIR = r"D:\BaiduNetdiskDownload\data sql\bibledata"
WORKSPACE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices"
DB_PATH = os.path.join(WORKSPACE, "data", "text-db")
H2_JAR = r"C:\Users\PC\.gradle\wrapper\dists\gradle-8.5-bin\5t9huq95ubn472n8rpzujfbqh\gradle-8.5\lib\h2-2.2.220.jar"
JAVA = os.path.join(WORKSPACE, "dist", "jdk-17.0.15+6-jre", "bin", "java.exe")
OUTPUT_SQL = os.path.join(WORKSPACE, "import_bible.sql")

# ─── Book data (book_num, name, osis_id, chapter_count) ───
BOOKS = [
    (1, "Genesis", "gen", 50), (2, "Exodus", "exo", 40), (3, "Leviticus", "lev", 27),
    (4, "Numbers", "num", 36), (5, "Deuteronomy", "deu", 34), (6, "Joshua", "jos", 24),
    (7, "Judges", "jdg", 21), (8, "Ruth", "rut", 4), (9, "1 Samuel", "1sa", 31),
    (10, "2 Samuel", "2sa", 24), (11, "1 Kings", "1ki", 22), (12, "2 Kings", "2ki", 25),
    (13, "1 Chronicles", "1ch", 29), (14, "2 Chronicles", "2ch", 36), (15, "Ezra", "ezr", 10),
    (16, "Nehemiah", "neh", 13), (17, "Esther", "est", 10), (18, "Job", "job", 42),
    (19, "Psalms", "psa", 150), (20, "Proverbs", "pro", 31), (21, "Ecclesiastes", "ecc", 12),
    (22, "Song of Solomon", "sng", 8), (23, "Isaiah", "isa", 66), (24, "Jeremiah", "jer", 52),
    (25, "Lamentations", "lam", 5), (26, "Ezekiel", "eze", 48), (27, "Daniel", "dan", 12),
    (28, "Hosea", "hos", 14), (29, "Joel", "jol", 3), (30, "Amos", "amo", 9),
    (31, "Obadiah", "oba", 1), (32, "Jonah", "jon", 4), (33, "Micah", "mic", 7),
    (34, "Nahum", "nam", 3), (35, "Habakkuk", "hab", 3), (36, "Zephaniah", "zep", 3),
    (37, "Haggai", "hag", 2), (38, "Zechariah", "zec", 14), (39, "Malachi", "mal", 4),
    (40, "Matthew", "mat", 28), (41, "Mark", "mrk", 16), (42, "Luke", "luk", 24),
    (43, "John", "jhn", 21), (44, "Acts", "act", 28), (45, "Romans", "rom", 16),
    (46, "1 Corinthians", "1co", 16), (47, "2 Corinthians", "2co", 13), (48, "Galatians", "gal", 6),
    (49, "Ephesians", "eph", 6), (50, "Philippians", "php", 4), (51, "Colossians", "col", 4),
    (52, "1 Thessalonians", "1th", 5), (53, "2 Thessalonians", "2th", 3), (54, "1 Timothy", "1ti", 6),
    (55, "2 Timothy", "2ti", 4), (56, "Titus", "tit", 3), (57, "Philemon", "phm", 1),
    (58, "Hebrews", "heb", 13), (59, "James", "jas", 5), (60, "1 Peter", "1pe", 5),
    (61, "2 Peter", "2pe", 3), (62, "1 John", "1jn", 5), (63, "2 John", "2jn", 1),
    (64, "3 John", "3jn", 1), (65, "Jude", "jud", 1), (66, "Revelation", "rev", 22),
]

TRANSLATIONS = [
    ("asv", "American Standard Version", "english", "ASV", "1901"),
    ("bbe", "Bible in Basic English", "english", "BBE", ""),
    ("cuv_gb", "Chinese Union Version (Simplified)", "chinese", "CUV", "和合本简体"),
    ("dby", "Darby Bible", "english", "DARBY", ""),
    ("kjv", "King James Version", "english", "KJV", ""),
    ("wbt", "Webster's Bible", "english", "WBT", ""),
    ("web", "World English Bible", "english", "WEB", ""),
    ("ylt", "Young's Literal Translation", "english", "YLT", ""),
]

def esc(s):
    return s.replace("'", "''")

def parse_eng(line):
    m = re.match(r"""INSERT\s+INTO\s+`?t_\w+`?\s+VALUES\s*\(\s*'(\d+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*)'\s*\)\s*;""", line, re.DOTALL)
    if not m: return None
    return (int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5).replace("\\'", "'"))

# Chinese abbreviation → book number
CU_BOOK_MAP = {
    '创':1,'出':2,'利':3,'民':4,'申':5,'书':6,'士':7,'得':8,
    '撒上':9,'撒下':10,'王上':11,'王下':12,'代上':13,'代下':14,
    '拉':15,'尼':16,'斯':17,'伯':18,'诗':19,'箴':20,'传':21,
    '歌':22,'赛':23,'耶':24,'哀':25,'结':26,'但':27,
    '何':28,'珥':29,'摩':30,'俄':31,'拿':32,'弥':33,
    '鸿':34,'哈':35,'番':36,'该':37,'亚':38,'玛':39,
    '太':40,'可':41,'路':42,'约':43,'徒':44,
    '罗':45,'林前':46,'林后':47,'加':48,'弗':49,
    '腓':50,'西':51,'帖前':52,'帖后':53,'提前':54,
    '提后':55,'多':56,'门':57,'来':58,
    '雅':59,'彼前':60,'彼后':61,'约一':62,'约二':63,'约三':64,'犹':65,'启':66,
}

def parse_cuv(line):
    # Format: ('创', 1, '01001001', 1, 1, 'text')
    # (chinese_name, testament, id, chapter, verse, text)
    m = re.match(r"""INSERT\s+INTO\s+`?t_cuv_gb`?\s+VALUES\s*\(\s*'([^']+)'\s*,\s*\d+\s*,\s*'\d+'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*)'\s*\)\s*;""", line, re.DOTALL)
    if not m: return None
    book_num = CU_BOOK_MAP.get(m.group(1))
    if not book_num: return None
    return (book_num, int(m.group(2)), int(m.group(3)), m.group(4).replace("\\'", "'"))

def main():
    print("=" * 60)
    print("Bible SQL Import Tool (Fast)")
    print("=" * 60)

    # Step 1: Parse all data
    all_data = {}
    for tcode, tname, tlang, tabbr, tdesc in TRANSLATIONS:
        fp = os.path.join(DATA_DIR, f"t_{tcode}.sql")
        if not os.path.exists(fp):
            print(f"  SKIP {tcode}: file not found")
            continue
        verses = []
        parser = parse_cuv if tcode == "cuv_gb" else parse_eng
        with open(fp, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith("INSERT"):
                    r = parser(line)
                    if r: verses.append(r)
        all_data[tcode] = verses
        print(f"  {tcode}: {len(verses)} verses")

    total = sum(len(v) for v in all_data.values())
    print(f"\nTotal: {total} verses, {len(all_data)} translations")

    # Step 2: Pre-compute IDs
    # Translation IDs: 1-based by index
    t_ids = {}
    for i, (tcode, *_) in enumerate(TRANSLATIONS):
        if tcode in all_data:
            t_ids[tcode] = i + 1

    # Book IDs: translation 1 -> books 1-66, translation 2 -> books 67-132, etc.
    # book_id = (t_id - 1) * 66 + book_num
    def get_book_id(tcode, book_num):
        return (t_ids[tcode] - 1) * 66 + book_num

    # Verse IDs: sequential starting from 1
    verse_seq = 0

    # Step 3: Generate SQL
    print("\nGenerating SQL...")
    sql = []

    # Schema
    sql.append("DROP TABLE IF EXISTS verses;")
    sql.append("DROP TABLE IF EXISTS books;")
    sql.append("DROP TABLE IF EXISTS translations;")
    sql.append("DROP TABLE IF EXISTS commentaries;")
    sql.append("DROP TABLE IF EXISTS notes;")
    sql.append("DROP TABLE IF EXISTS bookmarks;")

    sql.append("""
CREATE TABLE translations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    language VARCHAR(30) NOT NULL,
    abbreviation VARCHAR(10),
    description VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE books (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    translation_id BIGINT NOT NULL,
    book_id VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    english_name VARCHAR(100) NOT NULL,
    osis_id VARCHAR(10),
    order_index INT NOT NULL,
    chapter_count INT NOT NULL,
    FOREIGN KEY (translation_id) REFERENCES translations(id)
);
CREATE TABLE verses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL,
    chapter INT NOT NULL,
    verse INT NOT NULL,
    text CLOB NOT NULL,
    verse_key VARCHAR(40) NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id)
);
CREATE INDEX idx_verse_lookup ON verses(book_id, chapter, verse);
CREATE INDEX idx_verse_key ON verses(verse_key);

-- Annotation tables (preserved)
CREATE TABLE commentaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    book VARCHAR(30) NOT NULL,
    chapter INT NOT NULL,
    verse_start INT NOT NULL,
    verse_end INT,
    text CLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verse_ref VARCHAR(40) NOT NULL,
    title VARCHAR(200),
    content CLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE bookmarks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verse_ref VARCHAR(40) NOT NULL,
    color VARCHAR(20),
    note CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

    # Insert translations
    for tcode, tname, tlang, tabbr, tdesc in TRANSLATIONS:
        if tcode not in all_data: continue
        sql.append(f"INSERT INTO translations (id, code, name, language, abbreviation, description) "
                   f"VALUES ({t_ids[tcode]}, '{tcode}', '{esc(tname)}', '{tlang}', '{tabbr}', '{esc(tdesc)}');")

    # Insert books with explicit IDs
    for tcode in t_ids:
        for bnum, bname, bosis, ch_count in BOOKS:
            bid = get_book_id(tcode, bnum)
            sql.append(f"INSERT INTO books (id, translation_id, book_id, name, english_name, osis_id, order_index, chapter_count) "
                       f"VALUES ({bid}, {t_ids[tcode]}, '{bosis}', '{esc(bname)}', '{esc(bname)}', '{bosis}', {bnum}, {ch_count});")

    # Insert verses - batch 1000 per INSERT for speed
    batch_size = 200
    for tcode, verses in all_data.items():
        batch = []
        for bnum, ch, vs, txt in verses:
            if bnum < 1 or bnum > 66: continue
            bid = get_book_id(tcode, bnum)
            bosis = BOOKS[bnum - 1][2]
            vk = f"{tcode}.{bosis}.{ch}.{vs}"
            batch.append(f"({bid}, {ch}, {vs}, '{esc(txt)}', '{vk}')")

            if len(batch) >= batch_size:
                sql.append(f"INSERT INTO verses (book_id, chapter, verse, text, verse_key) VALUES "
                           + ",\n".join(batch) + ";")
                verse_seq += len(batch)
                batch = []
        if batch:
            sql.append(f"INSERT INTO verses (book_id, chapter, verse, text, verse_key) VALUES "
                       + ",\n".join(batch) + ";")
            verse_seq += len(batch)
        print(f"  {tcode}: {len(verses)} verses → SQL ({verse_seq} total so far)")

    # Set auto-increment to continue after our explicit IDs
    max_bid = max(get_book_id(tc, 66) for tc in t_ids)
    sql.append(f"ALTER TABLE books ALTER COLUMN id RESTART WITH {max_bid + 1};")
    sql.append(f"ALTER TABLE verses ALTER COLUMN id RESTART WITH {verse_seq + 1};")
    sql.append(f"ALTER TABLE translations ALTER COLUMN id RESTART WITH {len(t_ids) + 1};")

    # Write
    print(f"\nWriting {len(sql)} statements to SQL file...")
    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql))
    size_mb = os.path.getsize(OUTPUT_SQL) / (1024 * 1024)
    print(f"SQL file: {size_mb:.1f} MB")

    # Delete old DB
    for ext in ['.mv.db', '.trace.db']:
        db_file = DB_PATH + ext
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"Deleted: {db_file}")

    # Execute
    print("\nExecuting H2 RunScript (may take 1-3 minutes)...")
    jdbc_url = f"jdbc:h2:file:{DB_PATH.replace(chr(92), '/')};MODE=MySQL;LOG=0;UNDO_LOG=0"
    cmd = [JAVA, "-Xmx2g", "-cp", H2_JAR, "org.h2.tools.RunScript",
           "-url", jdbc_url, "-user", "sa", "-password", "",
           "-script", OUTPUT_SQL]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900, cwd=WORKSPACE)
    
    if result.returncode == 0:
        db_size = os.path.getsize(DB_PATH + '.mv.db') / (1024 * 1024)
        print(f"\n[OK] Import SUCCESS!")
        print(f"   DB: {DB_PATH}.mv.db ({db_size:.0f} MB)")
        print(f"   Verses: {verse_seq}")
        print(f"   Translations: {len(t_ids)}")
        # Cleanup SQL file (optional)
        # os.remove(OUTPUT_SQL)
    else:
        print(f"\n[FAILED] (exit {result.returncode})")
        err = result.stderr
        if err:
            for line in err.split('\n')[-30:]:
                print(f"   {line}")
        out = result.stdout
        if out:
            for line in out.split('\n')[-10:]:
                print(f"   {line}")

if __name__ == "__main__":
    main()