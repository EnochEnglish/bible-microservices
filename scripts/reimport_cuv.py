#!/usr/bin/env python3
"""Re-import CUV from original MySQL dump with correct UTF-8 encoding."""
import os, re, subprocess

DATA_DIR = r"D:\BaiduNetdiskDownload\data sql\bibledata"
WORKSPACE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices"
H2_JAR = r"C:\Users\PC\.gradle\wrapper\dists\gradle-8.5-bin\5t9huq95ubn472n8rpzujfbqh\gradle-8.5\lib\h2-2.2.220.jar"
JAVA = r"C:\Users\PC\scoop\apps\openjdk17\current\bin\java.exe"

BOOK_MAP = {
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

BOOKS = [
    (1,"Genesis","gen",50),(2,"Exodus","exo",40),(3,"Leviticus","lev",27),
    (4,"Numbers","num",36),(5,"Deuteronomy","deu",34),(6,"Joshua","jos",24),
    (7,"Judges","jdg",21),(8,"Ruth","rut",4),(9,"1 Samuel","1sa",31),
    (10,"2 Samuel","2sa",24),(11,"1 Kings","1ki",22),(12,"2 Kings","2ki",25),
    (13,"1 Chronicles","1ch",29),(14,"2 Chronicles","2ch",36),(15,"Ezra","ezr",10),
    (16,"Nehemiah","neh",13),(17,"Esther","est",10),(18,"Job","job",42),
    (19,"Psalms","psa",150),(20,"Proverbs","pro",31),(21,"Ecclesiastes","ecc",12),
    (22,"Song of Solomon","sng",8),(23,"Isaiah","isa",66),(24,"Jeremiah","jer",52),
    (25,"Lamentations","lam",5),(26,"Ezekiel","eze",48),(27,"Daniel","dan",12),
    (28,"Hosea","hos",14),(29,"Joel","jol",3),(30,"Amos","amo",9),
    (31,"Obadiah","oba",1),(32,"Jonah","jon",4),(33,"Micah","mic",7),
    (34,"Nahum","nam",3),(35,"Habakkuk","hab",3),(36,"Zephaniah","zep",3),
    (37,"Haggai","hag",2),(38,"Zechariah","zec",14),(39,"Malachi","mal",4),
    (40,"Matthew","mat",28),(41,"Mark","mrk",16),(42,"Luke","luk",24),
    (43,"John","jhn",21),(44,"Acts","act",28),(45,"Romans","rom",16),
    (46,"1 Corinthians","1co",16),(47,"2 Corinthians","2co",13),(48,"Galatians","gal",6),
    (49,"Ephesians","eph",6),(50,"Philippians","php",4),(51,"Colossians","col",4),
    (52,"1 Thessalonians","1th",5),(53,"2 Thessalonians","2th",3),(54,"1 Timothy","1ti",6),
    (55,"2 Timothy","2ti",4),(56,"Titus","tit",3),(57,"Philemon","phm",1),
    (58,"Hebrews","heb",13),(59,"James","jas",5),(60,"1 Peter","1pe",5),
    (61,"2 Peter","2pe",3),(62,"1 John","1jn",5),(63,"2 John","2jn",1),
    (64,"3 John","3jn",1),(65,"Jude","jud",1),(66,"Revelation","rev",22),
]

def esc(s):
    return s.replace("'", "''")

def parse_cuv(line):
    m = re.match(r"""INSERT\s+INTO\s+`?t_cuv_gb`?\s+VALUES\s*\(\s*'([^']+)'\s*,\s*\d+\s*,\s*'\d+'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*)'\s*\)\s*;""", line, re.DOTALL)
    if not m: return None
    book_num = BOOK_MAP.get(m.group(1))
    if not book_num: return None
    return (book_num, int(m.group(2)), int(m.group(3)), m.group(4).replace("\\'", "'"))

def main():
    # Read CUV source
    src = os.path.join(DATA_DIR, "t_cuv_gb.sql")
    print(f"Reading {src}...")
    verses = []
    with open(src, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith("INSERT"):
                r = parse_cuv(line)
                if r: verses.append(r)
    print(f"  {len(verses)} verses")

    # CUV is translation_id = 3, book_id starts at (3-1)*66+1 = 133
    base_bid = 133
    def get_book_id(bnum):
        return base_bid + bnum - 1

    sql = []
    # Delete existing CUV verses (keep translations/books table rows)
    sql.append("DELETE FROM verses WHERE book_id BETWEEN 133 AND 198;")
    
    # Insert CUV verses - batch 200
    batch = []
    for bnum, ch, vs, txt in verses:
        if bnum < 1 or bnum > 66: continue
        bid = get_book_id(bnum)
        bosis = BOOKS[bnum-1][2]
        vk = f"cuv_gb.{bosis}.{ch}.{vs}"
        batch.append(f"({bid}, {ch}, {vs}, '{esc(txt)}', '{vk}')")
        
        if len(batch) >= 200:
            sql.append("INSERT INTO verses (book_id, chapter, verse, text, verse_key) VALUES " + ",\n".join(batch) + ";")
            batch = []
    if batch:
        sql.append("INSERT INTO verses (book_id, chapter, verse, text, verse_key) VALUES " + ",\n".join(batch) + ";")
    
    print(f"  {len(sql)} SQL statements")

    # Write SQL file
    sql_file = os.path.join(os.environ.get('TEMP', '/tmp'), 'cuv_reimport.sql')
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql))
    print(f"SQL file: {os.path.getsize(sql_file)/1024:.0f} KB")

    # Execute with RunScript using CHARSET=UTF-8
    db_path = os.path.join(WORKSPACE, "data", "text-db")
    jdbc_url = f"jdbc:h2:file:{db_path.replace(chr(92), '/')};MODE=MySQL"
    print(f"\nRunning SQL against: {jdbc_url}")
    
    cmd = [JAVA, "-Xmx2g", "-cp", H2_JAR, "org.h2.tools.RunScript",
           "-url", jdbc_url, "-user", "sa", "-password", "",
           "-script", sql_file, "-charset", "UTF-8"]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        print(f"\n[OK] CUV re-imported: {len(verses)} verses")
        # Verify by querying directly
        print("Verifying...")
        check_sql = "SELECT text FROM verses v JOIN books b ON v.book_id = b.id JOIN translations t ON b.translation_id = t.id WHERE t.code = 'cuv_gb' AND b.book_id = 'jhn' AND v.chapter = 3 AND v.verse = 16;"
        check_file = os.path.join(os.environ.get('TEMP', '/tmp'), 'cuv_verify.sql')
        with open(check_file, 'w', encoding='utf-8') as f:
            f.write(check_sql)
        cmd2 = [JAVA, "-cp", H2_JAR, "org.h2.tools.RunScript",
                "-url", jdbc_url, "-user", "sa", "-password", "",
                "-script", check_file, "-charset", "UTF-8", "-showResults"]
        r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=30)
        print(r2.stdout[-500:] if len(r2.stdout) > 500 else r2.stdout)
    else:
        print(f"\n[FAILED] (exit {result.returncode})")
        if result.stderr:
            for line in result.stderr.split('\n')[-15:]:
                print(f"  {line}")

if __name__ == "__main__":
    main()