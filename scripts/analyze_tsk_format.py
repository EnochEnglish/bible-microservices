"""Analyze TSK decompressed text to find verse entry boundaries."""
import zlib, os, re

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'
base = os.path.join(dl, 'TSK', 'modules', 'comments', 'zcom', 'tsk')

# Decompress OT
bzz = open(os.path.join(base, 'ot.bzz'), 'rb').read()
text = zlib.decompress(bzz).decode('utf-8', errors='replace')

# Strategy: TSK uses newline as entry separator within compressed SWORD blocks
entries = text.split('\n')
print(f"Newline splits: {len(entries)} entries")
print(f"Maximum entry length: {max(len(e) for e in entries)}")
print(f"Non-empty entries: {sum(1 for e in entries if e.strip())}")

# Show a sample of entries
for i, e in enumerate(entries[:5]):
    print(f"  Entry {i} ({len(e)}c): {e[:200]}")
print("  ...")
for i, e in enumerate(entries[150:155]):
    print(f"  Entry {i+150} ({len(e)}c): {e[:200]}")
print("  ...")
for i, e in enumerate(entries[-5:]):
    print(f"  Entry {len(entries)-5+i} ({len(e)}c): {e[:200]}")

# Check if entries map 1:1 to verses
# Non-empty entries with content
content_entries = [e for e in entries if e.strip()]
print(f"\nContent entries (non-empty): {len(content_entries)}")

# Look for web/verse-like tags in entries
verse_tag_count = sum(1 for e in content_entries if re.search(r'<scripRef', e))
print(f"Entries with <scripRef>: {verse_tag_count}")

# Show variety of entry types
print("\n=== Entry type samples ===")
for e in content_entries[:3]:
    print(f"  [{len(e)}c] {e[:250]}")
print("  ---")
for e in content_entries[50:53]:
    print(f"  [{len(e)}c] {e[:250]}")
print("  ---")
for e in content_entries[-3:]:
    print(f"  [{len(e)}c] {e[:250]}")