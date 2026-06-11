#!/usr/bin/env python
"""Convert cuv_gb_export.tsv (simplified) to cuv_tw_import.tsv (traditional) using opencc."""
from opencc import OpenCC
import sys

cc = OpenCC('s2t')

in_file = 'cuv_gb_export.tsv'
out_file = 'cuv_tw_import.tsv'

count = 0
with open(in_file, 'r', encoding='utf-8') as fin, \
     open(out_file, 'w', encoding='utf-8') as fout:
    for line in fin:
        line = line.rstrip('\n')
        parts = line.split('\t', 4)
        if len(parts) == 5:
            text_s = parts[4].replace('\\n', '\n').replace('\\t', '\t').replace('\\\\', '\\')
            text_t = cc.convert(text_s)
            # Re-escape
            text_t = text_t.replace('\\', '\\\\').replace('\n', '\\n').replace('\t', '\\t')
            parts[4] = text_t
        fout.write('\t'.join(parts) + '\n')
        count += 1
        if count % 5000 == 0:
            print(f'  {count} verses converted...', flush=True)

print(f'\nDone! {count} verses converted → {out_file}')
