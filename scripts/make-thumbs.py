# Small WebP thumbnails for the game pages' screenshot strip (js/detail.js).
# The strip shows them 72 px wide (42 px for phone games), so each screenshot
# gets a copy that fits 240 x 240 px: sharp on 3x screens, a few KB each.
#   /img/shots/<game>/<n>.webp  ->  /img/shots/<game>/thumbs/<n>.webp
# Run after adding screenshots (needs Pillow): python3 scripts/make-thumbs.py
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'site'
PUBLIC = ROOT / 'public'
BOX = (240, 240)


def thumb_path(src):
    p = Path(src)
    return p.parent / 'thumbs' / (p.stem + '.webp')


def main():
    data = json.loads((ROOT / 'src' / 'data' / 'games.json').read_text())
    shots = [s for g in data['games'] for s in g['media'].get('shots') or []]
    made = 0
    for src in shots:
        out = PUBLIC / thumb_path(src).relative_to('/')
        source = PUBLIC / src.lstrip('/')
        if out.exists() and out.stat().st_mtime >= source.stat().st_mtime:
            continue
        out.parent.mkdir(exist_ok=True)
        im = Image.open(source).convert('RGB')
        im.thumbnail(BOX, Image.LANCZOS)
        im.save(out, 'WEBP', quality=78, method=6)
        made += 1
    print(f'{made} made, {len(shots)} screenshots')


if __name__ == '__main__':
    main()
