import zlib, os, re

dl = r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\scripts\commentary_data'
base = os.path.join(dl, 'TSK', 'modules', 'comments', 'zcom', 'tsk')
bzz = open(os.path.join(base, 'ot.bzz'), 'rb').read()
text = zlib.decompress(bzz).decode('utf-8', errors='replace')

# Find all verse markers
refs = re.findall(r'passage="([^"]*)"', text)
print(f"Total passage= markers: {len(refs)}")
for r in refs[:15]:
    print(f"  {r}")

# Show the full Genesis 1 section
idx1 = text.find('passage="Ge 1:1"')
idx2 = text.find('passage="Ge 2:1"')
if idx1 >= 0 and idx2 > idx1:
    section = text[idx1:idx2]
    print(f"\n=== Genesis 1 section ({len(section)} chars) ===")
    print(section[:3000])
    print("\n...LAST 1000 chars...\n")
    print(section[-1000:])