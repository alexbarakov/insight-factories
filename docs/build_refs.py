#!/usr/bin/env python3
"""Builds docs/references.md (market references by functional block) from docs/functional-blocks.md.
Run from the repository root: python3 docs/build_refs.py"""
import re, pathlib
root = pathlib.Path(__file__).parent
src = (root / 'functional-blocks.md').read_text(encoding='utf-8')
title = src.splitlines()[0].lstrip('# ').split(' — ')[0]
out = [f'# Market references — {title}', '',
       'The products and games the demo design draws on: for each functional block, one or two examples we consider the best, and what exactly we took from them.',
       'Built from the [functional blocks spec](functional-blocks.md) by `docs/build_refs.py`. Edit the spec, not this file.', '']
group, rows, seen = None, [], {}
for sec in re.split(r'\n(?=## |### )', src):
    head = sec.splitlines()[0]
    if head.startswith('## ') and re.match(r'## [A-Z]\. ', head):
        if rows: out += rows + ['']
        group = head[3:]; rows = [f'## {group}', '', '| Block | Reference | What we take |', '|---|---|---|']; continue
    m = re.match(r'### ([A-Z]\d+[a-z]?)\. (.+)', head)
    if not m or not group: continue
    code, name = m.groups()
    refs = re.search(r'- \*\*References\.\*\*\n((?:  - .+\n?)+)', sec)
    if not refs: continue
    for line in refs.group(1).strip().splitlines():
        r = re.match(r'\s*- \[(.+?)\]\((.+?)\)\s*[—-]\s*(.+)', line)
        if not r: continue
        ref, url, what = r.groups(); seen.setdefault(ref, (url, []))[1].append(code)
        rows.append(f'| {code} {name} | [{ref}]({url}) | {what.rstrip(".")} |')
if rows: out += rows + ['']
out += ['## All reference products', '', '| Product | Used in |', '|---|---|']
out += [f'| [{k}]({v[0]}) | {", ".join(x for i, x in enumerate(v[1]) if x not in v[1][:i])} |' for k, v in sorted(seen.items(), key=lambda x: (-len(x[1][1]), x[0].lower()))]
(root / 'references.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('blocks with references:', len({l.split()[1] for l in out if re.match(r'\| [A-Z]\d+[a-z]? ', l)}), '| products:', len(seen))
