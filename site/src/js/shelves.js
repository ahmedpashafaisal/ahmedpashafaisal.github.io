// "All games" as shelves, one per category (step D3, layout H). Covers keep
// their 16:9 art; a shelf only slides when its games do not fit, 2 or 3 games
// fill the width, 1 game shows its story beside the cover; each shelf with
// room ends in an empty slot, drawn as a building site (the next game, under
// construction). Phones get a short list per shelf (shelves.css).
// Juice, each telling the visitor something:
//   stocking: covers slide onto a shelf when it comes into view, landing with
//     a dot-grid thump while the count ticks up (how many games are here);
//   lift: covers lift and tilt toward the mouse, glint, squash on press;
//   peek: rest the mouse on a cover and it fades through 3 screenshots;
//   open: a click grows the cover into the game page (grow.js).
// The runaway bulb (shelfbulb.js) loads once the shelves come near, unless
// the 3D guide (hero3d.js) does its beats here (html.has-guide).
import data from '../data/games.json';
import { byCategory, primaryCat } from './order.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';
import { sendShock } from './dotgrid.js';
import { growOut } from './grow.js';

const STOCK_MS = 520;
const STOCK_GAP_MS = 110; // between covers landing
const PEEK_WAIT_MS = 450; // pointer resting this long starts the peek
const PEEK_MS = 1000; // per screenshot
const PEEK_SHOTS = 3;
const TILT = 4; // degrees at the cover's edge

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const meta = (g) => [g.year, g.platforms.join(', '), g.genre].filter(Boolean).map(esc).join(' · ');

function itemHTML(g) {
  const tall = g.media.orientation === 'portrait' ? ' shelf__shot--tall' : '';
  const shots = (g.media.shots || [])
    .slice(0, PEEK_SHOTS)
    .map((s) => `<img class="shelf__shot${tall}" data-src="${esc(s)}" alt="" decoding="async" />`)
    .join('');
  const art = g.media.card
    ? `<img src="${esc(g.media.card)}" alt="${esc(g.title)} cover art" width="800" height="450" loading="lazy" decoding="async" />`
    : `<span class="shelf__placeholder" aria-hidden="true">${esc(g.title.charAt(0))}</span>`;
  const star = g.featured ? ' <span class="shelf__star" aria-hidden="true">★</span>' : '';
  return `<a class="shelf__item" href="/games/${esc(g.slug)}.html" data-slug="${esc(g.slug)}">
    <span class="shelf__cover">${art}${shots}<span class="shelf__glint" aria-hidden="true"></span></span>
    <span class="shelf__text">
      <span class="shelf__meta">${meta(g)}</span>
      <span class="shelf__title">${esc(g.title)}${star}</span>
      <span class="shelf__genre">${esc(g.genre)}</span>
      <span class="shelf__hook">${esc(g.blurb)}</span>
      <span class="shelf__btn" aria-hidden="true">Open game →</span>
    </span>
  </a>`;
}

// Empty slot: the next game, under construction (a 320 x 180 scene, colours
// in shelves.css). Two sites take turns down the page: half built (brick wall
// going up, scaffold, a brick swinging on the crane hook) and broken (cracked
// screen behind caution tape, a barrier). Both have the road works sign, a
// cone and a blinking lamp; the wall top and the crate are where the runaway
// bulb stands to work (60% down, where shelf-bulb--slot puts its feet).
const SIGN = `<rect class="site__post" x="266" y="112" width="4" height="46"/>
  <path class="site__line site__yellow" d="M268 66l26 26-26 26-26-26z"/>
  <g class="site__pict"><circle cx="264" cy="80" r="3.6"/><path d="M264 85l3 12-5 8m5-8l5 7m-7-16l9 5 4 10m-1 0l-2 4 6-1z"/></g>`;
const CONE = `<path class="site__line site__cone" d="M297 124h8l8 32h-24z"/>
  <path class="site__band" d="M293.8 137h14.4l2 8h-18.4z"/>
  <rect class="site__post" x="285" y="155" width="32" height="4" rx="1.5"/>`;
const GROUND = '<rect class="site__ground" y="158" width="320" height="22"/><path class="site__line" d="M0 158h320"/>';
const LAMP = (x, y) => `<rect class="site__post" x="${x - 3}" y="${y + 4}" width="6" height="${y > 100 ? 8 : 4}"/><circle class="site__line site__lamp" cx="${x}" cy="${y}" r="5.5"/>`;
// Brick rows from the ground up, [x, width]; the top row is still going up
const WALL = [
  [146, [[116, 22], [138, 22], [160, 22], [182, 22]]],
  [134, [[116, 11], [127, 22], [149, 22], [171, 22], [193, 11]]],
  [122, [[116, 22], [138, 22], [160, 22], [182, 22]]],
  [110, [[127, 22], [149, 22], [171, 22]]],
]
  .flatMap(([y, row]) => row.map(([x, w]) => `<rect x="${x}" y="${y}" width="${w}" height="12" rx="1.5"/>`))
  .join('');

const SITES = [
  (hz) => `<path class="site__line" d="M28 158V58M74 158V58M24 58h54M28 82h46M28 134h46M28 82l46 26M28 108l46 26"/>
  <rect class="site__line" x="24" y="104" width="54" height="8" style="fill: url(#${hz})"/>
  ${LAMP(51, 48)}
  <g class="site__swing"><path class="site__line" d="M222 -4V40l-10 10m10-10l10 10"/><rect class="site__line site__yellow" x="208" y="50" width="28" height="13" rx="2"/></g>
  <g class="site__bricks">${WALL}</g>`,
  (hz) => `<path class="site__screen" d="M98 34H222a6 6 0 0 1 6 6V112l-9 6-7-4-6 12-8 2-4 12-4 10H98a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6z"/>
  <path class="site__crack" d="M128 62l-14-10-8-14M128 62l12-12 18-6 10 4M128 62l24 10 14 18 10 4M128 62l-6 22-16 12M128 62l-24 6M152 72l4 22"/>
  <path class="site__screen" d="M206 158l10-14 12 6 2 8z"/>
  <rect class="site__line" x="70" y="67" width="180" height="14" style="fill: url(#${hz})" transform="rotate(-12 160 74)"/>
  <path class="site__line" d="M24 129l-8 29M24 129l8 29M76 129l-8 29M76 129l8 29"/>
  <rect class="site__line" x="12" y="116" width="76" height="13" rx="2" style="fill: url(#${hz})"/>
  ${LAMP(24, 102)}
  <rect class="site__line site__crate" x="136" y="110" width="48" height="48" rx="2"/>
  <path class="site__line" d="M136 122h48M136 146h48M136 146l48-24"/>`,
];

let slots = 0; // building sites drawn so far: the next one takes the other turn
function slotHTML() {
  const i = slots++;
  const hz = `site-hz-${i}`;
  return `<div class="shelf__slot" aria-hidden="true">
    <span class="shelf__cover shelf__cover--empty"><svg class="site" viewBox="0 0 320 180" focusable="false">
  <defs><pattern id="${hz}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="site__yellow" width="14" height="14"/><rect class="site__black" width="7" height="14"/></pattern></defs>
  ${GROUND}
  ${SITES[i % SITES.length](hz)}
  ${SIGN}
  ${CONE}
</svg></span>
    <span class="shelf__text"><span class="shelf__title">Next game</span><span class="shelf__genre">Under construction</span></span>
  </div>`;
}

function shelfHTML(c) {
  const n = c.games.length;
  const mode = n === 1 ? 'solo' : n <= 3 ? 'fill' : 'rail';
  const slot = mode !== 'solo';
  const label = esc(c.label);
  const arrows =
    mode === 'rail'
      ? `<div class="shelf__arrows"><button class="shelf__arrow" type="button" data-d="-1" aria-label="Back through ${label}">‹</button><button class="shelf__arrow" type="button" data-d="1" aria-label="More ${label}">›</button></div>`
      : '';
  return `<section class="shelf shelf--${mode}" data-cat="${esc(c.id)}" style="--n: ${n + (slot ? 1 : 0)}" aria-label="${label}, ${n} ${n === 1 ? 'game' : 'games'}">
    <div class="shelf__head"><h3 class="shelf__name">${label} <span class="shelf__count" aria-hidden="true">${n}</span></h3>${arrows}</div>
    <div class="shelf__row">${c.games.map(itemHTML).join('')}${slot ? slotHTML() : ''}</div>
  </section>`;
}

// Stocking: covers slide in one by one; each landing thumps the dot grid
function stock(shelf) {
  const count = shelf.querySelector('.shelf__count');
  const parts = [...shelf.querySelectorAll('.shelf__row > *')];
  act(`shelf:${shelf.dataset.cat}`);
  if (!juicy()) return;
  // Covers sliding in widen a sliding shelf for a moment, and scroll snapping
  // would nudge it: hold the snap, and rail() ignores scrolls, until all land
  const row = shelf.querySelector('.shelf__row');
  row.style.scrollSnapType = 'none';
  shelf.dataset.stocking = '';
  let n = 0;
  let landed = 0;
  parts.forEach((el, i) => {
    el.classList.remove('is-unstocked');
    el.animate(
      [
        { transform: 'translateX(90px) rotate(5deg)', opacity: 0 },
        { transform: 'translateX(-6px) rotate(-1deg)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: STOCK_MS, delay: i * STOCK_GAP_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
    ).finished.then(() => {
      if (el.classList.contains('shelf__item')) {
        count.textContent = String(++n);
        count.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
      }
      const r = el.querySelector('.shelf__cover').getBoundingClientRect();
      if (r.right > 0 && r.left < innerWidth) sendShock(r.left + r.width / 2, r.bottom, 0.35);
      sfx.tick();
      if (++landed === parts.length) {
        row.style.scrollSnapType = '';
        delete shelf.dataset.stocking;
      }
    });
  });
}

// Lift + tilt + glint (CSS does the lift) and the screenshot peek; mouse only
function hover(item) {
  const cover = item.querySelector('.shelf__cover');
  const shots = [...item.querySelectorAll('.shelf__shot')];
  let timer = 0;
  item.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !juicy()) return;
    const r = cover.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    item.style.setProperty('--rx', `${(-(ny - 0.5) * 2 * TILT).toFixed(2)}deg`);
    item.style.setProperty('--ry', `${((nx - 0.5) * 2 * TILT).toFixed(2)}deg`);
    cover.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
    cover.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
  });
  item.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !juicy()) return;
    sfx.tick();
    if (!shots.length) return;
    shots.forEach((s) => s.dataset.src && !s.src && (s.src = s.dataset.src));
    let k = 0;
    timer = setTimeout(function next() {
      shots.forEach((s, i) => s.classList.toggle('is-on', i === k % shots.length));
      if (k === 0) act(`peek:${item.dataset.slug}`);
      k++;
      timer = setTimeout(next, PEEK_MS);
    }, PEEK_WAIT_MS);
  });
  item.addEventListener('pointerleave', () => {
    clearTimeout(timer);
    shots.forEach((s) => s.classList.remove('is-on'));
    item.style.removeProperty('--rx');
    item.style.removeProperty('--ry');
  });
  item.addEventListener('pointerdown', (e) => e.pointerType === 'mouse' && sfx.press());
}

// Sliding shelf: arrows. Tells the bulb about each slide with a 'shelf:slide'
// event ({ p }: 0 at the start, 1 at the end).
function rail(shelf) {
  const row = shelf.querySelector('.shelf__row');
  const [back, more] = shelf.querySelectorAll('.shelf__arrow');

  const place = (quiet) => {
    const max = row.scrollWidth - row.clientWidth;
    const p = max > 0 ? row.scrollLeft / max : 0;
    back.disabled = p < 0.01;
    more.disabled = p > 0.99;
    if (!quiet) shelf.dispatchEvent(new CustomEvent('shelf:slide', { detail: { p } }));
  };

  row.addEventListener('scroll', () => place('stocking' in shelf.dataset), { passive: true });
  addEventListener('resize', () => place(true));
  shelf.querySelectorAll('.shelf__arrow').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.press();
      row.scrollBy({ left: +b.dataset.d * row.clientWidth, behavior: juicy() ? 'smooth' : 'auto' });
    }),
  );
  requestAnimationFrame(() => place(true));
}

export function initShelves(root) {
  if (!root) return;
  const preview = new URLSearchParams(location.search).has('preview');
  const games = byCategory(data.games.filter((g) => preview || !g.hidden));
  const cats = data.categories
    .map((c) => ({ ...c, games: games.filter((g) => primaryCat(g) === c.id) }))
    .filter((c) => c.games.length);

  slots = 0;
  root.innerHTML = cats.map(shelfHTML).join('');
  const shelves = [...root.querySelectorAll('.shelf')];
  root.querySelectorAll('.shelf__item').forEach(hover);
  shelves.filter((s) => s.classList.contains('shelf--rail')).forEach(rail);

  // Open: the cover grows into the game page (plain click, motion allowed)
  root.addEventListener('click', (e) => {
    const item = e.target.closest('.shelf__item');
    if (!item || !juicy() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    growOut(item.querySelector('.shelf__cover'), item.href);
  });

  // Stocking, once per shelf, when it comes into view
  if (juicy()) {
    shelves.forEach((s) => {
      s.querySelector('.shelf__count').textContent = '0';
      s.querySelectorAll('.shelf__row > *').forEach((el) => el.classList.add('is-unstocked'));
    });
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        stock(en.target);
      }),
    { rootMargin: '0px 0px -12% 0px' },
  );
  shelves.forEach((s) => io.observe(s));

  // The runaway bulb: load it when the shelves are a screen away
  const near = new IntersectionObserver(
    ([en]) => {
      if (!en.isIntersecting) return;
      near.disconnect();
      if (document.documentElement.classList.contains('has-guide')) return;
      import('./shelfbulb.js').then((m) => m.initShelfBulb(root));
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(root);
}
