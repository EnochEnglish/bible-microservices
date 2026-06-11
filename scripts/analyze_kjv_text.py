import sys,io,zlib,re
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')

with open(r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz",'rb') as f:
    data=f.read()
text=zlib.decompress(data[1110:]).decode('utf-8',errors='replace')
print(f'Total chars: {len(text)}')

# Find all osisIDs
ids=re.findall(r'osisID="([^"]+)"', text)
unique=list(dict.fromkeys(ids))
print(f'Unique osisID: {unique[:15]}')

# Find chapter and show what follows
cp=text.find('CHAPTER 1.')
if cp>0:
    after=text[cp:cp+800]
    safe=after.encode('ascii','backslashreplace').decode('ascii')
    print(f'\n=== After CHAPTER 1. ===')
    print(safe)

# Better: scan for all tag patterns to understand structure
# Let's find the first few <w> tags and check their src values
words=re.finditer(r'<w\s+[^>]*src="(\d+)"[^>]*>', text[:50000])
srcs=[int(w.group(1)) for w in words]
print(f'\n=== First 50 src values: {srcs[:50]}')

# Look for where src resets to 1 (verse boundary)
reset_positions=[i for i in range(1,len(srcs)) if srcs[i]==1]
print(f'Positions where src=1 (verse boundaries): {reset_positions[:10]}')

# Check if src interval is consistent with verse word counts
intervals=[reset_positions[i+1]-reset_positions[i] for i in range(min(9,len(reset_positions)-1))]
print(f'Intervals between verse boundaries: {intervals}')
