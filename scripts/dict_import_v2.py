# -*- coding: utf-8 -*-
"""zLD dictionary importer: 2-level parsing (sub-index + XML)."""
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


def parse_xml_entry(block_bytes):
    """Extract (key, definition) from a single XML entry block."""
    text = block_bytes.decode('utf-8', errors='replace')
    key_m = re.search(r'n="([^"]+)"', text)
    if not key_m:
        return None
    entry_key = key_m.group(1)
    def_m = re.search(r'<def>(.*?)</def>', text, re.DOTALL)
    definition = strip_tags(def_m.group(1)) if def_m else strip_tags(
        re.sub(r'<entryFree[^>]*>|</entryFree>', '', text))
    if definition:
        return {"entryId": entry_key, "definition": definition}
    return None


def parse_sub_index(block_bytes):
    """Walk a sub-index block and extract all XML entries from it."""
    entries = []
    pos = 0
    
    while pos + 8 <= len(block_bytes):
        off = struct.unpack('<I', block_bytes[pos:pos+4])[0]
        sz  = struct.unpack('<I', block_bytes[pos+4:pos+8])[0]
        
        # Validate: offset must be within the block, size must be reasonable
        if off == 0 and sz == 0:
            pos += 8
            continue
        if off < 8 or off >= len(block_bytes) or sz == 0 or sz > len(block_bytes):
            break  # End of sub-index
        
        if off + sz > len(block_bytes):
            break
        
        chunk = block_bytes[off:off+sz]
        if chunk[:1] == b'<':  # XML entry
            result = parse_xml_entry(chunk)
            if result:
                entries.append(result)
        
        pos += 8
    
    return entries


def parse_zld(zip_path):
    """2-level parse: decompress each zdx block, then walk sub-index if present."""
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
        all_entries = []
        
        for i in range(n):
            off = struct.unpack('<I', zdx[i*8:i*8+4])[0]
            sz  = struct.unpack('<I', zdx[i*8+4:i*8+8])[0]
            
            if sz <= 0 or sz > 200000 or off + sz > len(zdt_raw):
                continue
            
            try:
                block = zlib.decompress(zdt_raw[off:off+sz])
            except:
                continue
            
            # Check if this is a sub-index block (starts with uint32 pairs) or direct XML
            if block[:1] == b'<':
                # Direct XML entry (Nave format)
                result = parse_xml_entry(block)
                if result:
                    all_entries.append(result)
            else:
                # Sub-index block (Easton/ISBE format)
                sub_entries = parse_sub_index(block)
                all_entries.extend(sub_entries)
        
        return all_entries


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
    # Step 1: Parse
    print("=== Step 1: Parse dictionaries ===", flush=True)
    all_entries = {}
    for code, cfg in DICTS.items():
        zip_path = os.path.join(SWORD_DIR, cfg["zip"])
        entries = parse_zld(zip_path)
        all_entries[code] = entries
        print(f"  {cfg['name']}: {len(entries)} entries", flush=True)
        if entries:
            k = entries[0]['entryId']
            print(f"    [0] {k}", flush=True)
            if len(entries) > 1:
                print(f"    [{len(entries)-1}] {entries[-1]['entryId']}", flush=True)
    
    total = sum(len(v) for v in all_entries.values())
    print(f"\n  Total: {total}", flush=True)
    
    # Step 2: Delete old entries from DB (skip if table doesn't exist)
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
            except:
                print(f"  dictionaries table not found for {src}", flush=True)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  DB error: {e}", flush=True)
    
    # Step 3: Import
    print("\n=== Step 3: Import via API ===", flush=True)
    for code, cfg in DICTS.items():
        if all_entries[code]:
            import_via_api(code, cfg["name"], all_entries[code])
    
    print("\nDone!", flush=True)