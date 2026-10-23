// Map look test, 2D version: the board drawn flat in SVG in the site's own
// look (cream board, ink outlines, hard shadows, category tints, lime). The
// camera is the viewBox. Billboards stand upright on the paper; each stop has
// a street lamp whose head is a small idea bulb that lights up with the stop.
import { ROAD_W } from './world.js';

const NS = 'http://www.w3.org/2000/svg';
const INK = 'var(--ink)';

// Car: the scroll-bar car (js/scrollcar.js), drawn nose up, 20 x 32
const CAR = `
  <rect x="0.5" y="5" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="15.5" y="5" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="0.5" y="20" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="15.5" y="20" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="3" y="1.5" width="14" height="29" rx="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1.5"/>
  <rect x="5.5" y="9" width="9" height="11" rx="2.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="5" y="2.8" width="3" height="1.8" rx="0.9" fill="#caff00"/>
  <rect x="12" y="2.8" width="3" height="1.8" rx="0.9" fill="#caff00"/>`;

// Props: 100 x 100, standing on (50, 96). Toon fills, ink outlines.
const O = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
const PROP = {
  tree: `<rect x="45" y="72" width="10" height="24" fill="#8a5a3b" ${O}/><path d="M50 8L76 46H62L82 76H18L38 46H24Z" fill="#4f9e6c" ${O}/><path d="M50 8L58 20L50 46H62L50 76H34" fill="#3f8a5b"/>`,
  'tree-round': `<rect x="45" y="62" width="10" height="34" fill="#8a5a3b" ${O}/><circle cx="50" cy="40" r="28" fill="#6fbf73" ${O}/><path d="M66 22a28 28 0 0 1-6 44a28 28 0 0 0 6-44Z" fill="#58a85f"/>`,
  'tree-crooked': `<path d="M48 96C46 80 56 72 50 58" fill="none" ${O} stroke-width="9"/><path d="M48 96C46 80 56 72 50 58" fill="none" stroke="#8a5a3b" stroke-width="5"/><path d="M22 48c-6-18 14-32 28-24c10-14 34-6 30 12c12 8 4 26-10 24c-6 10-26 10-30 0c-14 2-24-4-18-12Z" fill="#7aa95a" ${O}/>`,
  rock: `<path d="M14 96L22 60L44 44L70 50L86 74L88 96Z" fill="#a8a196" ${O}/><path d="M44 44L52 70L86 74" fill="none" stroke="${INK}" stroke-width="2.5" opacity="0.5"/>`,
  stones: `<path d="M10 96l6-16l16-4l10 12l-2 8Z" fill="#b5aea2" ${O}/><path d="M44 96l4-20l18-8l16 10l4 18Z" fill="#a8a196" ${O}/><path d="M80 96l2-10l10-2l4 12Z" fill="#bdb6aa" ${O}/>`,
  lantern: `<rect x="47" y="34" width="6" height="62" fill="${INK}"/><rect x="38" y="16" width="24" height="22" rx="4" fill="#f4c95d" ${O}/><path d="M34 16h32" ${O}/>`,
  hedge: `<rect x="10" y="60" width="80" height="36" rx="16" fill="#5fae6b" ${O}/><path d="M24 66q6-6 12 0M52 70q6-6 12 0" fill="none" stroke="#3f8a5b" stroke-width="3"/>`,
  fence: `<path d="M8 64h84M8 80h84" stroke="${INK}" stroke-width="10"/><path d="M8 64h84M8 80h84" stroke="#c08a5b" stroke-width="5"/><g fill="#c08a5b" ${O}><rect x="12" y="52" width="10" height="44"/><rect x="45" y="52" width="10" height="44"/><rect x="78" y="52" width="10" height="44"/></g>`,
  stall: `<rect x="18" y="56" width="64" height="40" fill="#f3e3c4" ${O}/><path d="M10 56L20 30H80L90 56Z" fill="#e8574b" ${O}/><path d="M34 30L30 56M50 30v26M66 30l4 26" stroke="#fff" stroke-width="6"/><path d="M10 56L20 30H80L90 56Z" fill="none" ${O}/>`,
  tent: `<path d="M8 96L50 22L92 96Z" fill="#4f7fd9" ${O}/><path d="M50 22L64 96H36Z" fill="#2f5fb9" ${O}/><path d="M50 22v-12" ${O}/>`,
  flag: `<rect x="30" y="14" width="6" height="82" fill="${INK}"/><path d="M36 16h44l-10 14l10 14H36Z" fill="#caff00" ${O}/>`,
  plant: `<path d="M50 96C50 70 30 66 20 52C40 52 50 66 50 80C50 60 56 40 74 34C70 56 58 66 50 96Z" fill="#6fbf73" ${O}/>`,
  cone: `<path d="M50 20L72 88H28Z" fill="#ff8a3d" ${O}/><path d="M38 56h24" stroke="#fff" stroke-width="7"/><rect x="18" y="86" width="64" height="10" rx="3" fill="#ff8a3d" ${O}/>`,
  fountain: `<ellipse cx="50" cy="80" rx="44" ry="16" fill="#b9b2a6" ${O}/><ellipse cx="50" cy="76" rx="34" ry="10" fill="#7cc4e8" ${O}/><rect x="46" y="42" width="8" height="34" fill="#b9b2a6" ${O}/><path d="M50 40c-10-14-22-8-24 4M50 40c10-14 22-8 24 4" fill="none" stroke="#7cc4e8" stroke-width="5" stroke-linecap="round"/>`,
};

const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const roundRect = (x, y, w, h, r, attrs) => el('rect', { x, y, width: w, height: h, rx: r, ...attrs });

export async function make2d(world) {
  const svg = el('svg', { class: 'map2d', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
  const defs = el('defs');
  svg.append(defs);
  for (const [k, v] of Object.entries(PROP)) defs.append(el('symbol', { id: `p-${k}`, viewBox: '0 0 100 100' }, v));

  // Board: cream slab with an ink edge and the hard black shadow
  const board = el('g');
  board.append(roundRect(10, 12, world.W, world.H, 36, { fill: INK }));
  board.append(roundRect(0, 0, world.W, world.H, 36, { fill: 'var(--surface)', stroke: INK, 'stroke-width': 4 }));
  svg.append(board);

  // Regions: soft tinted patches
  const patches = el('g');
  for (const p of world.patches) patches.append(roundRect(p.l, p.t, p.r - p.l, p.b - p.t, 28, { fill: `var(--cat-${p.cat})` }));
  svg.append(patches);

  // Road: ink edge, cream top, dashed middle line
  const d = world.pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  const road = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  road.append(el('path', { d, stroke: INK, 'stroke-width': ROAD_W + 8 }));
  road.append(el('path', { d, stroke: '#ece4d4', 'stroke-width': ROAD_W }));
  road.append(el('path', { d, stroke: INK, 'stroke-width': 2.5, 'stroke-dasharray': '12 14', opacity: 0.55 }));
  svg.append(road);

  // Props, back to front
  const props = el('g');
  for (const p of [...world.props].sort((a, b) => a.y - b.y)) {
    const s = 56 * p.s;
    props.append(el('use', { href: `#p-${p.type}`, x: p.x - s / 2, y: p.y - s * 0.96, width: s, height: s }));
  }
  svg.append(props);

  // Ground rings for "pop" (under the stops)
  const rings = el('g');
  svg.append(rings);
  // Stops: billboard on two posts, picture in an ink frame with a hard
  // shadow, and a street lamp whose head is a little idea bulb
  const stops = el('g');
  const parts = world.stops.map((s) => {
    const g = el('g', { class: 'map2d-stop' });
    const base = s.y - 30;
    const top = base - 26 - s.h;
    const lx = s.x + s.w / 2 + 16;
    g.append(el('path', { d: `M${s.x - s.w * 0.3} ${base}v-30M${s.x + s.w * 0.3} ${base}v-30`, stroke: INK, 'stroke-width': 5 }));
    g.append(roundRect(s.x - s.w / 2 - 4 + 6, top - 4 + 6, s.w + 8, s.h + 8, 8, { fill: INK }));
    g.append(roundRect(s.x - s.w / 2 - 4, top - 4, s.w + 8, s.h + 8, 8, { fill: 'var(--surface)', stroke: INK, 'stroke-width': 3.5 }));
    const clip = el('clipPath', { id: `clip-${s.i}` }, `<rect x="${s.x - s.w / 2}" y="${top}" width="${s.w}" height="${s.h}" rx="5"/>`);
    defs.append(clip);
    g.append(el('image', { href: s.g.media.card, x: s.x - s.w / 2, y: top, width: s.w, height: s.h, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#clip-${s.i})` }));
    g.append(el('path', { d: `M${lx} ${base + 4}V${top + 6}q0 -8 -10 -8`, fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }));
    const glow = el('circle', { cx: lx - 12, cy: top + 10, r: 30, fill: 'var(--accent)', opacity: 0 });
    const bulb = el('circle', { cx: lx - 12, cy: top + 6, r: 7, fill: '#d6d0c4', stroke: INK, 'stroke-width': 3 });
    g.append(glow, bulb);
    stops.append(g);
    const ring = el('ellipse', { cx: s.x, cy: base + 2, rx: s.w * 0.62, ry: 16, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 7, opacity: 0 });
    rings.append(ring);
    return { g, glow, bulb, ring, base, s };
  });
  svg.append(stops);

  // Spotlight: the board goes dark except a soft pool round the lit stop
  const mask = el('mask', { id: 'spot-mask', maskUnits: 'userSpaceOnUse' });
  const grad = el('radialGradient', { id: 'spot-grad' }, '<stop offset="0.55" stop-color="#000"/><stop offset="1" stop-color="#fff"/>');
  defs.append(grad);
  mask.append(el('rect', { x: -50, y: -50, width: world.W + 100, height: world.H + 100, fill: '#fff' }));
  const hole = el('circle', { r: 150, fill: 'url(#spot-grad)' });
  mask.append(hole);
  defs.append(mask);
  const dark = roundRect(0, 0, world.W, world.H, 36, { fill: '#14120f', mask: 'url(#spot-mask)', opacity: 0 });
  svg.append(dark);

  const car = el('g', {}, `<g transform="translate(-10 -16)">${CAR}</g>`);
  svg.append(car);

  let W = 0;
  let H = 0;
  let cam = { cx: world.W / 2, cy: world.H / 2, scale: 1 };
  return {
    el: svg,
    project(x, y, h) {
      return [(x - cam.cx) * cam.scale + W / 2, (y - h - cam.cy) * cam.scale + H / 2];
    },
    frame({ car: c, lit, max, current, light, cam: next, w, h }) {
      cam = next;
      W = w;
      H = h;
      svg.setAttribute('viewBox', `${cam.cx - w / cam.scale / 2} ${cam.cy - h / cam.scale / 2} ${w / cam.scale} ${h / cam.scale}`);
      car.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${((c.a * 180) / Math.PI + 90).toFixed(1)}) scale(1.7)`);
      parts.forEach((p, i) => {
        const k = lit[i];
        p.glow.setAttribute('opacity', (k * 0.45).toFixed(2));
        p.bulb.setAttribute('fill', k > 0.4 ? 'var(--accent)' : '#d6d0c4');
        const pop = light === 'pop' ? 1 + 0.22 * k : 1;
        p.g.setAttribute('transform', pop === 1 ? '' : `translate(${p.s.x} ${p.base}) scale(${pop.toFixed(3)}) translate(${-p.s.x} ${-p.base})`);
        p.ring.setAttribute('opacity', light === 'pop' ? k.toFixed(2) : 0);
        p.g.style.filter = light === 'dim' ? `grayscale(${(max * (1 - k)).toFixed(2)}) opacity(${(1 - 0.6 * max * (1 - k)).toFixed(2)})` : '';
      });
      const s = world.stops[current] ?? world.stops[0];
      hole.setAttribute('cx', s.x);
      hole.setAttribute('cy', s.y - 60);
      dark.setAttribute('opacity', light === 'spot' ? (0.38 * max).toFixed(2) : 0);
    },
    destroy() {},
  };
}
