// "All games" as shelves, one per category (step D3, layout H). Covers keep
// their 16:9 art; a shelf only slides when its games do not fit, 2 or 3 games
// fill the width, 1 game shows its story beside the cover; each shelf with
// room ends in an empty slot. Phones get a short list per shelf (shelves.css).
// Juice, each telling the visitor something:
//   stocking: covers slide onto a shelf when it comes into view, landing with
//     a dot-grid thump while the count ticks up (how many games are here);
//   lift: covers lift and tilt toward the mouse, glint, squash on press;
//   peek: rest the mouse on a cover and it fades through 3 screenshots;
//   open: a click grows the cover into the game page (grow.js);
//   car: the ink car drives along under a sliding shelf (where you are in it).
// The runaway bulb (shelfbulb.js) loads once the shelves come near.
import data from '../data/games.json';
import { byCategory, primaryCat } from './order.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';
import { sendShock } from './dotgrid.js';
import { CAR } from './scrollcar.js';
import { growOut } from './grow.js';

const STOCK_MS = 520;
const STOCK_GAP_MS = 110; // between covers landing
const PEEK_WAIT_MS = 450; // pointer resting this long starts the peek
const PEEK_MS = 1000; // per screenshot
const PEEK_SHOTS = 3;
const TILT = 4; // degrees at the cover's edge
const PUFF_MS = 60;

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

// Placeholder words: Ahmed rewrites
const SLOT = `<div class="shelf__slot" aria-hidden="true">
    <span class="shelf__cover shelf__cover--empty"><span>Next game</span></span>
    <span class="shelf__text"><span class="shelf__title">Empty slot</span><span class="shelf__genre">Not made yet</span></span>
  </div>`;

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
    <div class="shelf__row">${c.games.map(itemHTML).join('')}${slot ? SLOT : ''}</div>
    ${mode === 'rail' ? `<div class="shelf__road" aria-hidden="true"><span class="shelf__car">${CAR}</span></div>` : ''}
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

// Sliding shelf: arrows, and the car drives along the road under it. Tells
// the bulb about each slide with a 'shelf:slide' event ({ x, p }).
function rail(shelf) {
  const row = shelf.querySelector('.shelf__row');
  const road = shelf.querySelector('.shelf__road');
  const car = road.querySelector('.shelf__car');
  const [back, more] = shelf.querySelectorAll('.shelf__arrow');
  let last = 0;
  let lastPuff = 0;
  let atEnd = false;

  const place = (quiet) => {
    const max = row.scrollWidth - row.clientWidth;
    const p = max > 0 ? row.scrollLeft / max : 0;
    const x = 8 + p * Math.max(0, road.clientWidth - 50);
    const dir = row.scrollLeft >= last ? 1 : -1;
    last = row.scrollLeft;
    car.style.left = `${x}px`;
    car.style.setProperty('--dir', dir);
    back.disabled = p < 0.01;
    more.disabled = p > 0.99;
    if (quiet) return;
    const now = performance.now();
    if (juicy() && now - lastPuff > PUFF_MS) {
      lastPuff = now;
      const puff = Object.assign(document.createElement('span'), { className: 'shelf__puff' });
      puff.style.left = `${x + 16 - dir * 22}px`;
      road.append(puff);
      puff.animate([{ transform: 'scale(0.6)', opacity: 0.5 }, { transform: `translate(${-dir * 14}px, -10px) scale(1.7)`, opacity: 0 }], {
        duration: 520,
        easing: 'ease-out',
      }).finished.then(() => puff.remove());
    }
    if (p > 0.995 && !atEnd) {
      atEnd = true;
      if (juicy()) {
        car.animate([{ scale: '1' }, { scale: '0.8 1.3' }, { scale: '1' }], { duration: 320, easing: 'ease-out' });
        sfx.boing();
      }
    }
    if (p < 0.98) atEnd = false;
    shelf.dispatchEvent(new CustomEvent('shelf:slide', { detail: { x, p } }));
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
      import('./shelfbulb.js').then((m) => m.initShelfBulb(root));
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(root);
}
