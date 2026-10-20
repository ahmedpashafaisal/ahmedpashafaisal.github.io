// Writes one HTML shell per game into site/games/<slug>.html from
// site/game-template.html. The page content itself is rendered in the
// browser from games.json (site/src/js/detail.js), so sections without data
// (no video, no screenshots...) are simply skipped.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'site');
const { games } = JSON.parse(readFileSync(resolve(root, 'src/data/games.json'), 'utf8'));
const template = readFileSync(resolve(root, 'game-template.html'), 'utf8');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const out = resolve(root, 'games');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const g of games) {
  if (g.hidden) continue;
  const html = template
    .replaceAll('{{slug}}', esc(g.slug))
    .replaceAll('{{title}}', esc(g.title))
    .replaceAll('{{description}}', esc(g.blurb));
  writeFileSync(resolve(out, `${g.slug}.html`), html);
}
console.log(`gen-pages: ${games.filter((g) => !g.hidden).length} game pages`);
