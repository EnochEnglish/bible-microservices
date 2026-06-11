import struct, zlib, os, sys

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'

# Parse MHC OT
bzs_path = os.path.join(dl, 'MHC', 'modules', 'comments', 'zcom4', 'mhc', 'ot.bzs')
bzz_path = os.path.join(dl, 'MHC', 'modules', 'comments', 'zcom4', 'mhc', 'ot.bzz')

bzs = open(bzs_path, 'rb').read()
bzz = open(bzz_path, 'rb').read()

print(f"bzs: {len(bzs)} bytes ({len(bzs)//8} books)")
print(f"bzz: {len(bzz)} bytes")

# Parse entries
entries = []
for i in range(0, len(bzs), 8):
    offset, size = struct.unpack('<II', bzs[i:i+8])
    if offset == 0 and size == 0:
        continue
    entries.append((i//8, offset, size))

print(f"Found {len(entries)} book entries")

# Check actual bzz structure
# The .bzs may store decompressed offsets+compressed sizes
# Let's check what follows after each compressed block in bzz

for i in range(min(5, len(entries))):
    book_idx, offset, size = entries[i]
    bzz_end = offset + size if i == 0 else entries[i-1][1] + entries[i-1][2]
    
    # Check arbitrary location in bzz
    check_offsets = [0, 1000, 1110, 1120, 1500]
    for co in check_offsets[:2]:
        if co < len(bzz):
            h = bzz[co:co+4].hex(' ')
            #print(f"  bzz[{co}]: {h}")
    
    # Decompress book 0 from bzz
    if i == 0:
        raw = bzz[0:size]
        try:
            text = zlib.decompress(raw).decode('utf-8', errors='replace')
            print(f"Book 0 decompressed: {len(text)} chars from {size} compressed bytes")
            print(f"Text: {text[:200]}")
        except Exception as e:
            print(f"Book 0 decompress fail: {e}")
    
    # Check what's at offset after book 0's compressed block
    if i == 0 and size < len(bzz) - 10:
        print(f"\nAfter Book 0 compressed block (bzz[{size}:{size+20}]):")
        print(f"  hex: {bzz[size:size+20].hex(' ')}")
        # Try to decompress from here
        for try_size in [2000, 5000, 10000]:
            try:
                chunk = bzz[size:size+try_size]
                text = zlib.decompress(chunk).decode('utf-8', errors='replace')
                print(f"  zlib({try_size}): SUCCESS - {len(text)} chars")
                print(f"  Preview: {text[:300]}")
                break
            except Exception as e:
                pass

# Actually let me directly find all zlib blocks in bzz
print(f"\nScanning bzz for zlib headers (78 9c):")
pos = 0
found = 0
while pos < len(bzz) - 2 and found < 10:
    if bzz[pos] == 0x78 and bzz[pos+1] in (0x01, 0x5e, 0x9c, 0xda):
        end = min(pos+50000, len(bzz))
        for try_size in [1000, 3000, 5000, 10000, 50000]:
            try:
                chunk = bzz[pos:pos+try_size]
                text = zlib.decompress(chunk).decode('utf-8', errors='replace')
                print(f"  pos={pos} size={try_size}: {len(text)} chars")
                print(f"    {text[:120]}")
                found += 1
                break
            except:
                pass
    pos += 1