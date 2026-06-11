# -*- coding: utf-8 -*-
"""Delete bad Easton/ISBE entries from H2 and re-import with fixed parser."""
import sys, os, zlib, struct, re, jaydebeapi
from zipfile import ZipFile
sys.stdout.reconfigure(encoding='utf-8')

H2_JAR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\bible-text-service\data\lib"  # find h2 jar
DB_DIR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\bible-text-service\data"

# Find H2 JAR
def find_h2_jar():
    # Search in common locations
    for root in [DB_DIR, r"C:\Users\PC\.gradle", r"C:\Users\PC\.m2"]:
        if not os.path.exists(root): continue
        for dirpath, dirs, files in os.walk(root):
            for f in files:
                if f.startswith('h2-') and f.endswith('.jar'):
                    return os.path.join(dirpath, f)
    return None

h2_jar = find_h2_jar()
if not h2_jar:
    print("H2 JAR not found, trying Gradle cache")
    import glob
    candidates = glob.glob(r"C:\Users\PC\.gradle\cache*\**\h2-*.jar", recursive=True)
    if candidates:
        h2_jar = candidates[0]

print(f"H2 JAR: {h2_jar}")

# Connect to H2
db_path = os.path.join(DB_DIR, "text-db")
jdbc_url = f"jdbc:h2:file:{db_path};IFEXISTS=TRUE"

try:
    conn = jaydebeapi.connect(
        "org.h2.Driver",
        jdbc_url,
        ["sa", ""],
        h2_jar
    )
    cursor = conn.cursor()
    
    # Delete bad Easton entries
    cursor.execute("DELETE FROM commentaries WHERE source='easton' AND chapter=0")
    deleted = cursor.rowcount
    print(f"Deleted Easton entries from commentaries: {deleted}")

    # Delete bad ISBE entries  
    cursor.execute("DELETE FROM commentaries WHERE source='isbe' AND chapter=0")
    deleted = cursor.rowcount
    print(f"Deleted ISBE entries from commentaries: {deleted}")

    # Also delete from dictionaries table if it exists
    try:
        cursor.execute("DELETE FROM dictionaries WHERE source='easton'")
        deleted = cursor.rowcount
        print(f"Deleted Easton from dictionaries: {deleted}")
    except:
        print("No dictionaries table (will be re-created)")

    try:
        cursor.execute("DELETE FROM dictionaries WHERE source='isbe'")
        deleted = cursor.rowcount
        print(f"Deleted ISBE from dictionaries: {deleted}")
    except:
        pass

    conn.commit()
    conn.close()
    print("DB cleanup complete!")
    
except Exception as e:
    print(f"DB connection failed: {e}")
    print("Continuing with API-based import (existing bad data may cause duplicates)")

print("\nNow re-run import_dictionaries.py --import for clean import")