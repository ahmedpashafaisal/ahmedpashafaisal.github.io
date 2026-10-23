// Map look test (step 6a, dev only): the world both versions draw.
// A road winds across a board in rows (U-turns at the ends); each game is a
// stop on it, grouped by region (its category), legendary games bigger.
// Billboards stand above the road, names sit below it. Rows are picked so
// the board's shape fits the screen (wide on desktop, tall on a phone).
// World units: about 1 css px when the whole board fits a desktop screen.
import data from '../src/data/games.json';
import { primaryCat } from '../src/js/order.js';

const MX = 150; // board edge to row end (the U-turns bulge into it)
const TOP = 170; // board top to the first row (room for billboards)
const BOTTOM = 90;
const ROW_GAP = 230;
const EDGE = 90; // row end to the nearest stop
const SPACING = 220; // stop to stop
const REGION_GAP = 0.6; // extra space between regions, in stops
export const ROAD_W = 40;
export const SIZE = { legendary: [150, 84], common: [110, 62] }; // billboard picture

// Games in map order: region by region (games.json category order), then
// legendary first, newest first
export function stopsInOrder() {
  const rank = new Map(data.categories.map((c, i) => [c.id, i]));
  return data.games
    .filter((g) => !g.hidden)
    .sort(
      (a, b) =>
        rank.get(primaryCat(a)) - rank.get(primaryCat(b)) ||
        (a.rarity === 'legendary' ? 0 : 1) - (b.rarity === 'legendary' ? 0 : 1) ||
        (b.year ?? 0) - (a.year ?? 0),
    );
}

export function buildWorld(aspect) {
  const games = stopsInOrder();
  const n = games.length;
  const regions = [...new Set(games.map(primaryCat))];
  const slots = n + (regions.length - 1) * REGION_GAP;
  // Rows: the count whose board shape is closest to the screen's
  let best = null;
  for (let rows = 1; rows <= 10; rows++) {
    const usable = Math.max((slots * SPACING) / rows, SPACING * 1.5);
    const W = usable + 2 * EDGE + 2 * MX;
    const H = TOP + (rows - 1) * ROW_GAP + BOTTOM;
    const miss = Math.abs(Math.log(W / H / aspect));
    if (!best || miss < best.miss) best = { rows, W, H, usable, miss };
  }
  const { rows, W, H, usable } = best;
  const rowLen = W - 2 * MX;
  const turn = (Math.PI * ROW_GAP) / 2;
  const rowY = (r) => TOP + r * ROW_GAP;
  const dirOf = (r) => (r % 2 ? -1 : 1);

  // Road: rows joined by half circles, sampled every 4 units with distance and heading
  const pts = [];
  const push = (x, y) => {
    const p = pts[pts.length - 1];
    const d = p ? p.d + Math.hypot(x - p.x, y - p.y) : 0;
    pts.push({ x, y, d });
  };
  for (let r = 0; r < rows; r++) {
    const dir = dirOf(r);
    const x0 = dir > 0 ? MX : W - MX;
    for (let s = 0; s <= rowLen; s += 4) push(x0 + dir * s, rowY(r));
    if (r < rows - 1) {
      const cx = dir > 0 ? W - MX : MX;
      const cy = rowY(r) + ROW_GAP / 2;
      for (let a = 4 / (ROW_GAP / 2); a < Math.PI; a += 4 / (ROW_GAP / 2)) {
        push(cx + dir * Math.sin(a) * (ROW_GAP / 2), cy - Math.cos(a) * (ROW_GAP / 2));
      }
    }
  }
  pts.forEach((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const o = pts[Math.max(i - 1, 0)];
    p.a = Math.atan2(q.y - o.y, q.x - o.x);
  });
  const length = pts[pts.length - 1].d;
  // Point on the road at distance d (linear between samples)
  function at(d) {
    d = Math.min(Math.max(d, 0), length);
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (pts[m].d <= d) lo = m;
      else hi = m;
    }
    const p = pts[lo];
    const q = pts[hi];
    const k = q.d > p.d ? (d - p.d) / (q.d - p.d) : 0;
    return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, a: Math.atan2(Math.sin(p.a + (q.a - p.a) * k), Math.cos(p.a + (q.a - p.a) * k)) };
  }

  // Stops: evenly along the rows' straight parts, a bit more room between regions
  const per = usable; // usable straight length in each row
  const step = (usable * rows) / slots;
  let pos = step / 2;
  const stops = games.map((g, i) => {
    if (i && primaryCat(g) !== primaryCat(games[i - 1])) pos += step * REGION_GAP;
    const r = Math.min(rows - 1, Math.floor(pos / per));
    const off = EDGE + (pos - r * per);
    const d = r * (rowLen + turn) + off;
    const { x, y } = at(d);
    const [w, h] = SIZE[g.rarity === 'legendary' ? 'legendary' : 'common'];
    pos += step;
    return { i, g, cat: primaryCat(g), legendary: g.rarity === 'legendary', d, x, y, row: r, w, h };
  });

  // Region patches: one rounded box per region per row it touches
  const patches = [];
  for (const cat of regions) {
    const mine = stops.filter((s) => s.cat === cat);
    for (const r of new Set(mine.map((s) => s.row))) {
      const inRow = mine.filter((s) => s.row === r);
      const l = Math.min(...inRow.map((s) => s.x - s.w / 2)) - 46;
      const rr = Math.max(...inRow.map((s) => s.x + s.w / 2)) + 46;
      patches.push({ cat, l, r: rr, t: rowY(r) - 162, b: rowY(r) + 66, first: inRow[0] === mine[0] });
    }
  }

  // Props by region (same spots in 2D and 3D): in the gap between two
  // billboards on a row, and one bigger piece inside each U-turn
  const THEME = {
    'pc-steam': ['rock', 'tree-crooked', 'stones'],
    gamification: ['lantern', 'hedge', 'fence'],
    mobile: ['tree-round', 'stall', 'hedge'],
    jams: ['tent', 'flag', 'plant'],
    'web-games': ['tree', 'plant', 'cone'],
  };
  const props = [];
  stops.forEach((s, k) => {
    const next = stops[k + 1];
    if (!next || next.row !== s.row) return;
    const gap = Math.abs(next.x - s.x) - (s.w + next.w) / 2;
    const set = THEME[s.cat === next.cat ? s.cat : next.cat];
    const x = (s.x + next.x) / 2;
    if (gap > 34) props.push({ type: set[k % set.length], x, y: s.y - 44, s: 1 });
    if (gap > 70) props.push({ type: set[(k + 1) % set.length], x: x + 12, y: s.y - 118, s: 0.8 });
  });
  for (let r = 0; r < rows - 1; r++) {
    const cx = dirOf(r) > 0 ? W - MX : MX;
    const kinds = ['fountain', 'tree-round', 'tent', 'rock', 'stall'];
    props.push({ type: kinds[r % kinds.length], x: cx + dirOf(r) * 44, y: rowY(r) + ROW_GAP / 2, s: 1.1 });
  }

  return { W, H, rows, pts, length, at, stops, patches, props, categories: data.categories };
}
