# -*- coding: utf-8 -*-
"""Fixed import: skip zLD index-block entries (entry 0 > 10KB)."""
import sys, os, zlib, struct, re, json, time
from urllib.request import Request, urlopen
from zipfile import ZipFile
sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "http://localhost:8081"
BASE = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-mods"

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


def is_index_block(block_bytes):
    """Decompressed data > 3KB and not starting with '<' = zLD index block.
    Normal dictionary entries start directly with XML and are under 3KB."""
    if len(block_bytes) > 3000 and block_bytes[:1] != b'<':
        return True
    return False


def parse_zld(zip_path):
    entries = []
    with ZipFile(zip_path) as zf:
        zdx_name = zdt_name = None
        for m in zf.namelist():
            if m.endswith('.zdx'): zdx_name = m
            if m.endswith('.zdt'): zdt_name = m
        
        if not zdx_name or not zdt_name:
            return [], 0
        
        zdx_raw = zf.read(zdx_name)
        zdt_raw = zf.read(zdt_name)
        
        try: zdx = zlib.decompress(zdx_raw)
        except: zdx = zdx_raw
        
        n = len(zdx) // 8
        failed = 0
        
        for i in range(n):
            off = struct.unpack('<I', zdx[i*8:i*8+4])[0]
            sz  = struct.unpack('<I', zdx[i*8+4:i*8+8])[0]
            
            if sz <= 0 or sz > 200000 or off + sz > len(zdt_raw):
                failed += 1
                continue
            
            try:
                block = zlib.decompress(zdt_raw[off:off+sz])
                
                # Skip if this is an index block (entry 0 for ISBE/Easton)
                if is_index_block(block):
                    failed += 1
                    continue
                
                text = block.decode('utf-8', errors='replace')
                key_m = re.search(r'n="([^"]+)"', text)
                if not key_m:
                    failed += 1
                    continue
                
                entry_key = key_m.group(1)
                def_m = re.search(r'<def>(.*?)</def>', text, re.DOTALL)
                definition = strip_tags(def_m.group(1)) if def_m else strip_tags(
                    re.sub(r'<entryFree[^>]*>|</entryFree>', '', text))
                
                if definition:
                    entries.append({"entryId": entry_key, "definition": definition})
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                if i < 3:
                    print(f"  [{i}] FAIL: {e}", flush=True)
    
    return entries, failed


def import_via_api(source, source_name, entries, batch_size=100):
    total = len(entries)
    print(f"  Importing {total} entries via API (batch={batch_size})...", flush=True)
    for i in range(0, total, batch_size):
        batch = entries[i:i+batch_size]
        payload = json.dumps({'source': source, 'sourceName': source_name, 'entries': batch}, ensure_ascii=False).encode('utf-8')
        try:
            req = Request(f'{API_BASE}/api/v1/annotations/import-dictionary', data=payload,
                          headers={'Content-Type': 'application/json; charset=utf-8'}, method='POST')
            resp = urlopen(req, timeout=60)
            end_idx = min(i+batch_size, total)
            result = resp.read().decode('utf-8')[:200]
            print(f"    [{i+1}-{end_idx}/{total}] {result}", flush=True)
        except Exception as e:
            print(f"    Batch FAIL: {e}", flush=True)
            return False
    return True


if __name__ == '__main__':
    all_stats = {}
    for code, cfg in DICTS.items():
        zip_path = os.path.join(BASE, cfg["zip"])
        print(f"\n{'='*60}\nParsing: {cfg['name']} ({code})", flush=True)
        t0 = time.time()
        entries, failed = parse_zld(zip_path)
        elapsed = time.time() - t0
        print(f"  Parsed: {len(entries)} entries, {failed} failed ({elapsed:.1f}s)", flush=True)
        all_stats[code] = len(entries)
        if entries:
            k, defn = entries[0]['entryId'], entries[0]['definition']
            print(f"  [0] {k}: {defn[:150]}...", flush=True)
    
    print(f"\n{'='*60}\nSummary: {all_stats}\nTotal: {sum(all_stats.values())}", flush=True)
    
    if '--import' in sys.argv:
        print("\n*** Importing via API... ***", flush=True)
        for code, cfg in DICTS.items():
            zip_path = os.path.join(BASE, cfg["zip"])
            entries, _ = parse_zld(zip_path)
            if entries:
                ok = import_via_api(code, cfg["name"], entries)
                print(f"  {code}: {'OK' if ok else 'FAILED'}", flush=True)
