#!/usr/bin/env python3
"""Create web-optimized copies of the AVHL team assets.

The source ZIPs are master artwork and should remain archived separately.
This script creates deployment-friendly WebP copies under public/teams/<ABBR>/.
"""
from __future__ import annotations

import argparse
import io
import re
import zipfile
from pathlib import Path
from PIL import Image

PATTERNS = {
    'logos': re.compile(r'26_([A-Z]+)_Logo\.png$', re.I),
    'arenas': re.compile(r'26_([A-Z]+)_Arena\.png$', re.I),
    'mascots': re.compile(r'26_([A-Z]+)_Mascot\.png$', re.I),
    'jerseys': re.compile(r'26_([A-Z]+)_(Home|Away|Alt)\.png$', re.I),
}


def resized(im: Image.Image, max_width: int) -> Image.Image:
    if im.width <= max_width:
        return im.copy()
    height = round(im.height * max_width / im.width)
    return im.resize((max_width, height), Image.Resampling.LANCZOS)


def save_webp(im: Image.Image, output: Path, *, quality: int = 86, lossless: bool = False):
    output.parent.mkdir(parents=True, exist_ok=True)
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
    im.save(output, 'WEBP', quality=quality, method=4, lossless=lossless)


def process(zip_path: Path, kind: str, public: Path):
    pattern = PATTERNS[kind]
    seen = set()
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if name.endswith('/') or '/._' in name or name.startswith('__MACOSX/'):
                continue
            base = Path(name).name
            match = pattern.match(base)
            if not match:
                continue
            abbr = match.group(1).upper()
            target_dir = public / 'teams' / abbr
            with z.open(name) as raw:
                im = Image.open(io.BytesIO(raw.read()))
                im.load()
            if kind == 'logos':
                out = target_dir / 'logo.webp'
                save_webp(resized(im, 700), out, lossless=True)
                seen.add((abbr, 'logo'))
            elif kind == 'arenas':
                out = target_dir / 'arena.webp'
                save_webp(resized(im.convert('RGB'), 1800), out, quality=84)
                seen.add((abbr, 'arena'))
            elif kind == 'mascots':
                out = target_dir / 'mascot.webp'
                save_webp(resized(im, 720), out, quality=88)
                seen.add((abbr, 'mascot'))
            else:
                variant = match.group(2).lower()
                out = target_dir / f'{variant}.webp'
                save_webp(resized(im, 720), out, quality=88)
                seen.add((abbr, variant))
    return seen


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--logos', type=Path, required=True)
    p.add_argument('--jerseys', type=Path, required=True)
    p.add_argument('--mascots', type=Path, required=True)
    p.add_argument('--arenas', type=Path, required=True)
    p.add_argument('--public', type=Path, default=Path(__file__).resolve().parents[1] / 'public')
    args = p.parse_args()

    all_seen = {}
    for kind in ('logos', 'jerseys', 'mascots', 'arenas'):
        all_seen[kind] = process(getattr(args, kind), kind, args.public)

    teams = {abbr for abbr, _ in all_seen['logos']}
    if len(teams) != 40:
        raise SystemExit(f'Expected 40 logo/team abbreviations, found {len(teams)}')
    for abbr in sorted(teams):
        expected = {
            'logos': {(abbr, 'logo')},
            'jerseys': {(abbr, 'home'), (abbr, 'away'), (abbr, 'alt')},
            'mascots': {(abbr, 'mascot')},
            'arenas': {(abbr, 'arena')},
        }
        for kind, need in expected.items():
            missing = need - all_seen[kind]
            if missing:
                raise SystemExit(f'Missing {kind} assets for {abbr}: {sorted(missing)}')
    print('Optimized 240 team assets for 40 teams.')

if __name__ == '__main__':
    main()
