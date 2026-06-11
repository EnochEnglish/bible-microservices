#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Delete then re-import dictionaries. Entry 0 index-block fix (≥20KB non-XML)."""
import sys, os, zlib, struct, re, json, jaydebeapi
from zipfile import ZipFile
sys.stdout.reconfigure(encoding='utf-8')

BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices"
H2_JAR = os.path.join(BASE, "scripts", "h2-2.2.224.jar")
DB_DIR = os.path.join(BASE, "bible-text-service", "data")
SWORD_DIR = os.path.join(BASE, "data", "sword-mods")
DB_PATH = os.path.join(DB_DIR, "text-db")
API_BASE = "http://localhost:8081"

DICTS = {
    "easton": {"zip": "Easton.zip", "name": "Easton's Bible Dictionary"},
    "isbe":   {"zip": "ISBE.zip",   "name": "International Standard Bible Encyclopedia"},
    "nave":   {"zip": "Nave.zip",   "name": "Nave's Topical Bible"}
}

def strip_tags(text):
    text = re.sub(r'<scripRef[^>]*>([^<]*)</scripRef>', r'\1', text)
    text = re.sub(r'<ref[^>]*>([^<]*)</ref>', r'\1', text)
    text = re.sub(r'<lb\s*/?>', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def parse_zld(zip_path):
    entries = []
    with ZipFile(zip_path) as zf:
        zdx_name = zdt_name = None
        for m in zf.namelist():
            if m.endswith('.zdx'): zdx_name = m
            if m.endswith('.zdt'): zdt_name = m
        if not zdx_name or not zdt_name:
            return []
        
        zdx_raw = zf.read(zdx_name)
        zdt_raw = zf.read(zdt_name)
        try: zdx = zlib.decompress(zdx_raw)
        except: zdx = zdx_raw
        
        n = len(zdx) // 8
        skipped_idx = 0; failed_size = 0; failed_zlib = 0; no_key = 0; no_def = 0
        
        for i in range(n):
            off = struct.unpack('<I', zdx[i*8:i*8+4])[0]
            sz  = struct.unpack('<I', zdx[i*8+4:i*8+8])[0]
            
            if sz <= 0 or sz > 200000 or off + sz > len(zdt_raw):
                failed_size += 1
                continue
            
            try:
                block = zlib.decompress(zdt_raw[off:off+sz])
            except:
                failed_zlib += 1
                continue
            
            # Only skip entry 0 (index block ≥20KB, not starting with <)
            if i == 0 and len(block) > 20000 and block[:1] != b'<':
                skipped_idx += 1
                continue
            
            text = block.decode('utf-8', errors='replace')
            key_m = re.search(r'n="([^"]+)"', text)
            if not key_m:
                no_key += 1
                continue
            
            entry_key = key_m.group(1)
            def_m = re.search(r'<def>(.*?)</def>', text, re.DOTALL)
            definition = strip_tags(def_m.group(1)) if def_m else strip_tags(
                re.sub(r'<entryFree[^>]*>|</entryFree>', '', text))
            
            if definition:
                entries.append({"entryId": entry_key, "definition": definition})
            else:
                no_def += 1
        
        if skipped_idx or failed_size or failed_zlib or no_key or no_def:
            print(f"  Stats: skipped_idx={skipped_idx} failed_size={failed_size} failed_zlib={failed_zlib} no_key={no_key} no_def={no_def}", flush=True)
    
    return entries

def delete_dict_entries():
    conn = jaydebeapi.connect("org.h2.Driver",
        f"jdbc:h2:file:{DB_PATH};IFEXISTS=TRUE", ["sa", ""], H2_JAR)
    cur = conn.cursor()
    # Check table name (Hibernate may use different naming)
    tables = cur.execute("SHOW TABLES").fetchall()
    tables_list = [str(t) for t in tables]
    print(f"  Tables: {tables_list}", flush=True)
    
    for src in ["easton", "isbe", "nave"]:
        for tbl in ["DICTIONARIES", "DICTIONARY_ENTRIES", "DICTIONARY_ENTRY"]:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE SOURCE=?", (src,))
                cnt = cur.fetchone()
                if cnt:
                    print(f"  {src} in {tbl}: {cnt[0]} entries", flush=True)
            except:
                pass
        try:
            cur.execute("DELETE FROM dictionaries WHERE source=?", (src,))
            print(f"  Deleted {cur.rowcount} from dictionaries for {src}", flush=True)
        except Exception as e:
            print(f"  Delete {src}: {e}", flush=True)
    conn.commit()
    conn.close()

def import_via_api(source, source_name, entries, batch_size=100):
    import urllib.request
    total = len(entries)
    print(f"  Sending {total} entries...", flush=True)
    for i in range(0, total, batch_size):
        batch = entries[i:i+batch_size]
        payload = json.dumps({'source': source, 'sourceName': source_name,
                             'entries': batch}, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(f'{API_BASE}/api/v1/annotations/import-dictionary',
                                     data=payload,
                                     headers={'Content-Type': 'application/json; charset=utf-8'},
                                     method='POST')
        resp = urllib.request.urlopen(req, timeout=60)
        end = min(i+batch_size, total)
        result = resp.read().decode('utf-8')
        print(f"    [{i+1}-{end}/{total}] {result[:120]}", flush=True)

if __name__ == '__main__':
    # Step 1: Delete
    print("=== Step 1: Delete bad entries ===", flush=True)
    delete_dict_entries()
    
    # Step 2: Parse
    print("\n=== Step 2: Parse dictionaries ===", flush=True)
    all_entries = {}
    for code, cfg in DICTS.items():
        zip_path = os.path.join(SWORD_DIR, cfg["zip"])
        entries = parse_zld(zip_path)
        all_entries[code] = entries
        print(f"  {cfg['name']}: {len(entries)} entries", flush=True)
        if entries:
            k, d = entries[0]['entryId'], entries[0]['definition']
            print(f"    [0] {k}: {d[:120]}...", flush=True)
            if len(entries) > 1:
                k2, d2 = entries[-1]['entryId'], entries[-1]['definition']
                print(f"    [{len(entries)-1}] {k2}: {d2[:120]}...", flush=True)
    
    total = sum(len(v) for v in all_entries.values())
    print(f"\n  Total: {total} entries ({', '.join(f'{k}={len(v)}' for k,v in sorted(all_entries.items()))})", flush=True)
    
    # Step 3: Import
    print("\n=== Step 3: Import via API ===", flush=True)
    for code, cfg in DICTS.items():
        if all_entries[code]:
            import_via_api(code, cfg["name"], all_entries[code])
    
    print("\nDone!", flush=True)