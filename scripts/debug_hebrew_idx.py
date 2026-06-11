"""Parse Hebrew rawLD: 8-byte entries [offset:u32_BE][size:u32_BE]."""
import struct, os, re, json

base_dir = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\sword-dicts\StrongsHebrew\modules\lexdict\rawld\strongshebrew'
idx_path = base_dir + '\\strongshebrew.idx'
dat_path = base_dir + '\\strongshebrew.dat'

with open(idx_path, 'rb') as f:
    idx_data = f.read()
with open(dat_path, 'rb') as f:
    dat_data = f.read()

print(f"idx size: {len(idx_data)}, dat size: {len(dat_data)}")
print(f"idx entries: {len(idx_data)//8}")

# Parse as 8-byte (offset:BE, size:BE) pairs
entries = []
for i in range(0, len(idx_data), 8):
    off = struct.unpack_from('>I', idx_data, i)[0]
    sz = struct.unpack_from('>I', idx_data, i+4)[0]
    entries.append((off, sz))

# Verify: last entry
print(f"First 5: {entries[:5]}")
print(f"Last 5: {entries[-5:]}")
print(f"Total entries: {len(entries)}")

# Check if dat is big enough for the last entry
print(f"dat[-1] offset={entries[-1][0]}, size={entries[-1][1]}")
end = entries[-1][0] + entries[-1][1]
print(f"Last entry ends at byte {end}, dat size={len(dat_data)}")

# Read first entry content
off, sz = entries[0]
chunk = dat_data[off:off+sz]
print(f"\nFirst entry at offset={off}, size={sz}:")
try:
    text = chunk.decode('utf-8', errors='replace')
    print(repr(text[:300]))
except:
    print(repr(chunk[:100]))