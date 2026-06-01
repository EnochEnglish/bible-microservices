# -*- coding: utf-8 -*-
"""zLD dictionary importer v3: regex-scan <entryFree> blocks from decompressed data."""
import sys, os, zlib, struct, re, json
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

def parse_entries_from_block(block_bytes):
    """Scan entire decompressed block for all <entryFree> XML tags."""
    entries = []
    text = block_bytes.decode('utf-8', errors='replace')
    
    # Find all <entryFree n="KEY">...</entryFree> blocks
    # Also match <entry n="KEY">...</entry> variants
    pattern = re.compile(r'<entry(?:Free)?\s+n="([^"]+)"\s*>(.*?)</entry(?:Free)?>', re.DOTALL)
    for m in pattern.finditer(text):
        entry_key = m.group(1)
        body = m.group(2)
        def_m = re.search(r'<def>(.*?)</def>', body, re.DOTALL)
        definition = strip_tags(def_m.group(1)) if def_m else strip_tags(
            re.sub(r'<orth>[^<]*</orth>', '', body))
        if definition and len(definition.strip()) > 5:
            entries.append({"entryId": entry_key, "definition": definition.strip()})
    
    return entries

def parse_zld(zip_path):
    """zLD parser: decompress each .zdt block, regex-scan all <entryFree>."""
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
        seen_keys = set()
        all_entries = []
        empty_blocks = 0
        
        for i in range(n):
            off = struct.unpack('<I', zdx[i*8:i*8+4])[0]
            sz  = struct.unpack('<I', zdx[i*8+4:i*8+8])[0]
            
            if sz <= 0 or sz > 200000 or off + sz > len(zdt_raw):
                continue
            
            try:
                block = zlib.decompress(zdt_raw[off:off+sz])
            except:
                continue
            
            block_entries = parse_entries_from_block(block)
            if block_entries:
                for e in block_entries:
                    if e['entryId'] not in seen_keys:
                        seen_keys.add(e['entryId'])
                        all_entries.append(e)
            elif len(block) > 100 and block[:1] != b'\x1e':
                # Direct single XML entry (Nave style, no sub-index)
                text = block.decode('utf-8', errors='replace')
                key_m = re.search(r'n="([^"]+)"', text)
                if key_m:
                    entry_key = key_m.group(1)
                    if entry_key not in seen_keys:
                        def_m = re.search(r'<def>(.*?)</def>', text, re.DOTALL)
                        definition = strip_tags(def_m.group(1)) if def_m else strip_tags(
                            re.sub(r'<orth>[^<]*</orth>', '', text))
                        if definition and len(definition.strip()) > 5:
                            seen_keys.add(entry_key)
                            all_entries.append({"entryId": entry_key, "definition": definition.strip()})
            elif not block_entries and len(block) > 50:
                empty_blocks += 1
        
        if empty_blocks:
            print(f"  Note: {empty_blocks}/{n} blocks had no entries found", flush=True)
        return all_entries

def import_via_api(source, source_name, entries, batch_size=100):
    import urllib.request
    total = len(entries)
    print(f"  Sending {total} entries...", flush=True)
    imported, skipped_total = 0, 0
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
        result = json.loads(resp.read().decode('utf-8'))
        imported += result.get('imported', 0)
        skipped_total += result.get('skipped', 0)
        print(f"    [{i+1}-{end}/{total}] imported={result.get('imported',0)} skipped={result.get('skipped',0)}", flush=True)
    return imported, skipped_total

if __name__ == '__main__':
    # Step 1: Parse
    print("=== Step 1: Parse dictionaries ===", flush=True)
    all_entries = {}
    for code, cfg in DICTS.items():
        zip_path = os.path.join(SWORD_DIR, cfg["zip"])
        entries = parse_zld(zip_path)
        all_entries[code] = entries
        print(f"  {cfg['name']}: {len(entries)} entries", flush=True)
        if entries:
            print(f"    [0] {entries[0]['entryId']}", flush=True)
            if len(entries) > 1:
                print(f"    [{len(entries)-1}] {entries[-1]['entryId']}", flush=True)
    
    total = sum(len(v) for v in all_entries.values())
    print(f"\n  Total: {total} entries\n  Breakdown: {', '.join(f'{k}={len(v)}' for k,v in sorted(all_entries.items()))}", flush=True)
    
    # Step 2: Clean DB
    print("\n=== Step 2: Clean H2 DB ===", flush=True)
    import jaydebeapi
    try:
        conn = jaydebeapi.connect("org.h2.Driver",
            f"jdbc:h2:file:{DB_PATH};IFEXISTS=TRUE", ["sa", ""], H2_JAR)
        cur = conn.cursor()
        for src in ["easton", "isbe", "nave"]:
            try:
                cur.execute("DELETE FROM dictionaries WHERE source=?", (src,))
                print(f"  Deleted {cur.rowcount} from dictionaries ({src})", flush=True)
            except Exception as e:
                print(f"  Delete {src}: {e}", flush=True)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  DB error: {e}", flush=True)
    
    # Step 3: Import
    print("\n=== Step 3: Import via API ===", flush=True)
    for code, cfg in DICTS.items():
        if all_entries[code]:
            imp, skp = import_via_api(code, cfg["name"], all_entries[code])
            print(f"  {code}: imported={imp} skipped={skp}", flush=True)
    
    print("\nDone!", flush=True)