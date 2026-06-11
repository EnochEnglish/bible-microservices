import sys,io,zlib,re
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')

with open(r"D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv\nt.bzz",'rb') as f:
    data=f.read()
text=zlib.decompress(data[1110:]).decode('utf-8',errors='replace')

# Extract all <w> tags with full attributes and inner text
words_all=list(re.finditer(r'<w\s+([^>]*)>([^<]+)</w>', text[:200000]))

# Show first 30 words with their attributes
for i, m in enumerate(words_all[:30]):
    attrs=m.group(1)
    inner=m.group(2)
    src=re.search(r'\bsrc="(\d+)"', attrs)
    lemma=re.search(r'\blemma="([^"]*strong:[GH]\d+[^"]*)"', attrs)
    src_val=src.group(1) if src else '?'
    lem_val=lemma.group(1) if lemma else '?'
    safe_inner=inner.encode('ascii','backslashreplace').decode('ascii')
    print(f'[{i}] src={src_val} lemma={lem_val[:40]:40s} text={safe_inner[:30]}')
