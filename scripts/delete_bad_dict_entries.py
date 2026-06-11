#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Delete bad dictionary entries (index blocks) from H2 database."""
import sys, os, jaydebeapi, glob
sys.stdout.reconfigure(encoding='utf-8')

# Find H2 JAR
H2_JAR = None
patterns = [
    os.path.expanduser(r"~\.gradle\caches\modules-2\files-2.1\com.h2database\h2\*\*\h2-*.jar"),
    r"C:\Users\PC\.gradle\caches\modules-2\files-2.1\com.h2database\h2\*\*\h2-*.jar",
]
for pat in patterns:
    matches = glob.glob(pat, recursive=True)
    if matches:
        H2_JAR = max(matches, key=os.path.getsize)
        break

if not H2_JAR:
    print("ERROR: H2 JAR not found", flush=True)
    sys.exit(1)

print(f"H2 JAR: {H2_JAR}", flush=True)

# DB path - match what bible-text-service uses
DB_DIR = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\bible-text-service\data"
DB_PATH = os.path.join(DB_DIR, "text-db")
JDBC_URL = f"jdbc:h2:file:{DB_PATH};IFEXISTS=TRUE"

print(f"Connecting to: {JDBC_URL}", flush=True)

try:
    conn = jaydebeapi.connect(
        "org.h2.Driver",
        JDBC_URL,
        ["sa", ""],
        H2_JAR
    )
    cur = conn.cursor()

    for src in ["easton", "isbe", "nave"]:
        try:
            cur.execute("SELECT COUNT(*) FROM dictionaries WHERE source=?", (src,))
            before = cur.fetchone()[0]
            print(f"  {src}: {before} entries before delete", flush=True)
        except Exception as e:
            print(f"  {src}: table may not exist yet ({e})", flush=True)

    # Delete all dictionary entries (clean slate)
    for src in ["easton", "isbe", "nave"]:
        try:
            cur.execute("DELETE FROM dictionaries WHERE source=?", (src,))
            print(f"  Deleted {cur.rowcount} from {src}", flush=True)
        except Exception as e:
            print(f"  Delete {src} failed (table may not exist): {e}", flush=True)

    conn.commit()

    # Verify
    for src in ["easton", "isbe", "nave"]:
        try:
            cur.execute("SELECT COUNT(*) FROM dictionaries WHERE source=?", (src,))
            after = cur.fetchone()[0]
            print(f"  {src}: {after} entries after delete", flush=True)
        except:
            print(f"  {src}: 0 (table empty or not exists)", flush=True)

    conn.close()
    print("\nDone! Database cleaned.", flush=True)

except Exception as e:
    print(f"ERROR: {e}", flush=True)
    sys.exit(1)
