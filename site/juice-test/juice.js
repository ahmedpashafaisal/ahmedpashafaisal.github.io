// Step D3 wireframe: H Adaptive shelves (see layouts-test) with each juice
// idea (1–5) and bulb beat (a–c) switchable, so they can be felt before the
// real build. The bulb is the real runaway bulb (js/bulb.js); the rest is grey.
import '../src/styles/tokens.css';
import '../src/styles/bulb.css';
import '../layouts-test/layouts.css';
import './juice.css';
import data from '../src/data/games.json';
import { byCategory, primaryCat } from '../src/js/order.js';
import { makeBulb, play } from '../src/js/bulb.js';
import { sfx, setSound, soundOn } from '../src/js/sound.js';
import { juicy } from '../src/js/motion.js';

const games = byCategory(data.games.filter((g) => !g.hidden));
const cats = data.categories
  .map((c) => ({ ...c, games: games.filter((g) => primaryCat(g) === c.id) }))
  .filter((c) => c.games.length);
const bySlug = Object.fromEntries(games.map((g) => [g.slug, g]));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const meta = (g) => [g.year, g.platforms.join(', '), g.genre].filter(Boolean).map(esc).join(' · ');
const star = (g) => (g.featured ? '<span class="lt-star" title="Featured">★</span>' : '');
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const JUICE = {
  j1: ['1 Stocking', 'Scroll down: covers slide onto each shelf and land with a thump; the count ticks up.'],
  j2: ['2 Lift', 'Point at a cover: it lifts and tilts, the shadow grows, a glint follows. Press: it squashes.'],
  j3: ['3 Open', 'Click a cover: it grows into the top of the game page. "Back" (or Esc) shrinks it home.'],
  j4: ['4 Peek', 'Rest the pointer on a cover: it cross-fades through 3 screenshots.'],
  j5: ['5 Car', 'Slide the Mobile shelf (arrows, trackpad or drag): the car drives along, puffs smoke, bounces at the end.'],
};
const BULB = {
  none: ['None', 'No bulb beat. (Rest when you rest still works on the real site.)'],
  a: ['a Empty slot', 'Each shelf ends with an empty slot. Point at the one with the bulb: "Nope, not a game yet." It hops to another slot.'],
  b: ['b Hops ahead', 'The bulb sits on a cover. Point at that cover: "Hold still!", it hops one cover ahead.'],
  c: ['c Rides the slide', 'Slide the Mobile shelf: the bulb runs ahead of the car and jumps off at the end.'],
};
const state = { j1: true, j2: true, j3: true, j4: true, j5: true, bulb: 'a', covers: 'on', width: 'desk' };

function cover(g) {
  const real = state.covers === 'on';
  const portrait = g.media.orientation === 'portrait' ? ' jt-shot--portrait' : '';
  const shots = state.j4
    ? (g.media.shots || [])
        .slice(0, 3)
        .map((src, k) =>
          real
            ? `<img class="jt-shot${portrait}" data-src="${esc(src)}" alt="" />`
            : `<span class="jt-shot jt-shot--grey">Screenshot ${k + 1}</span>`,
        )
        .join('')
    : '';
  const art = real ? `<img src="${esc(g.media.card)}" alt="" />` : `<span>${esc(g.title)}</span>`;
  return `<div class="lt-cover h-cover">${art}${shots}<span class="jt-glint"></span></div>`;
}

function shelvesHTML() {
  return cats
    .map((c) => {
      const n = c.games.length;
      const mode = n === 1 ? 'solo' : n <= 3 ? 'fill' : 'rail';
      const slot = state.bulb === 'a' && mode !== 'solo';
      const road = mode === 'rail' && (state.j5 || state.bulb === 'c');
      const arrows =
        mode === 'rail'
          ? '<span class="h-arrows"><button type="button" data-d="-1" aria-label="Back">‹</button><button type="button" data-d="1" aria-label="More">›</button></span>'
          : '';
      const items = c.games
        .map(
          (g) => `<a class="h-item jt-item" href="#" data-slug="${esc(g.slug)}">${cover(g)}<div class="h-text"><p class="lt-meta h-meta">${meta(g)}</p>
          <h4 class="lt-title">${esc(g.title)} ${star(g)}</h4><p class="lt-meta h-genre">${esc(g.genre)}</p>
          <p class="lt-hook h-hook">${esc(g.blurb)}</p><span class="lt-btn h-btn">Open game →</span></div></a>`,
        )
        .join('');
      const slotHTML = slot
        ? `<div class="h-item jt-slot"><div class="lt-cover h-cover jt-slot__box"><span>Next game</span></div>
           <div class="h-text"><h4 class="lt-title">In the works</h4><p class="lt-meta h-genre">Coming soon</p></div></div>`
        : '';
      return `<section class="h-shelf h-shelf--${mode}" style="--n: ${n + (slot ? 1 : 0)}">
        <div class="e-head"><h3 class="lt-cat">${esc(c.label)} <span class="jt-count">${state.j1 && juicy() ? 0 : n}</span></h3>${arrows}</div>
        <div class="h-row">${items}${slotHTML}</div>${road ? '<div class="jt-road"><span class="lt-car jt-car"></span></div>' : ''}</section>`;
    })
    .join('');
}

// Small speech bubble over an element (bulb) or at a screen point (visitor)
function say(text, { el, x, y }) {
  const b = Object.assign(document.createElement('span'), { className: 'jt-say', textContent: text });
  if (el) el.append(b);
  else {
    b.classList.add('jt-say--fixed');
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    document.body.append(b);
  }
  setTimeout(() => b.remove(), 1600);
}

function ring(item) {
  const cov = item.querySelector('.h-cover');
  const r = Object.assign(document.createElement('span'), { className: 'jt-ring' });
  r.style.top = `${cov.offsetTop + cov.offsetHeight - 4}px`;
  item.append(r);
  r.animate([{ transform: 'translateX(-50%) scale(0.3)', opacity: 0.7 }, { transform: 'translateX(-50%) scale(1.6)', opacity: 0 }], {
    duration: 450,
    easing: 'ease-out',
  }).finished.then(() => r.remove());
}

function puff(road, x, dir) {
  const p = Object.assign(document.createElement('span'), { className: 'jt-puff' });
  p.style.left = `${x}px`;
  road.append(p);
  p.animate([{ transform: 'scale(0.6)', opacity: 0.5 }, { transform: `translate(${-dir * 14}px, -10px) scale(1.7)`, opacity: 0 }], {
    duration: 520,
    easing: 'ease-out',
  }).finished.then(() => p.remove());
}

// Runaway bulb in a holder that can be moved between spots
function bulbHolder(size, cls) {
  const holder = Object.assign(document.createElement('span'), { className: `jt-bulb ${cls}` });
  const b = makeBulb({ size, eyes: true });
  holder.append(b);
  return { holder, b };
}

// 3. Cover grows into the top of a mock game page
function openGame(item) {
  const g = bySlug[item.dataset.slug];
  const from = item.querySelector('.h-cover');
  const page = document.createElement('div');
  page.className = 'jt-page';
  page.innerHTML = `<button type="button" class="jt-back">← Back</button><div class="jt-page__hero"></div>
    <div class="jt-page__body"><p class="lt-meta">${meta(g)}</p><h2 class="jt-page__title">${esc(g.title)}</h2>
    <p class="lt-hook">${esc(g.blurb)}</p><p class="lt-role"><b>My role</b> ${esc(g.role)}</p><p class="jt-page__note">Game page: screenshots, story, links…</p></div>`;
  document.body.append(page);
  const hero = page.querySelector('.jt-page__hero');
  const a = from.getBoundingClientRect();
  const b = hero.getBoundingClientRect();
  const clone = from.cloneNode(true);
  clone.classList.add('jt-clone');
  Object.assign(clone.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  document.body.append(clone);
  const inv = (r) => `translate(${r.left - b.left}px, ${r.top - b.top}px) scale(${r.width / b.width}, ${r.height / b.height})`;
  const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  from.style.visibility = 'hidden';
  sfx.whoosh();
  clone.animate([{ transform: inv(a) }, { transform: 'none' }], { duration: 480, easing: ease });
  page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both' });
  page.querySelector('.jt-page__body').animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], {
    duration: 300,
    delay: 300,
    fill: 'both',
    easing: ease,
  });

  const close = () => {
    removeEventListener('keydown', onKey);
    const r = from.getBoundingClientRect();
    page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    clone.animate([{ transform: 'none' }, { transform: inv(r) }], { duration: 420, easing: ease, fill: 'forwards' }).finished.then(() => {
      from.style.visibility = '';
      clone.remove();
      page.remove();
    });
  };
  const onKey = (e) => e.key === 'Escape' && close();
  page.querySelector('.jt-back').addEventListener('click', close);
  addEventListener('keydown', onKey);
}

let io = null;
function wire(view) {
  const shelves = [...view.querySelectorAll('.h-shelf')];
  const items = [...view.querySelectorAll('.jt-item')];

  // Rail arrows
  view.querySelectorAll('.h-arrows button').forEach((btn) =>
    btn.addEventListener('click', () => {
      const row = btn.closest('.h-shelf').querySelector('.h-row');
      row.scrollBy({ left: +btn.dataset.d * row.clientWidth, behavior: 'smooth' });
    }),
  );

  // 1. Stocking: covers slide onto a shelf when it scrolls into view
  if (state.j1 && juicy()) {
    shelves.forEach((sh) => sh.querySelectorAll('.h-row > .h-item').forEach((it) => it.classList.add('jt-undealt')));
    io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          const count = en.target.querySelector('.jt-count');
          let c = 0;
          [...en.target.querySelectorAll('.h-row > .h-item')].forEach((it, i) => {
            it.classList.remove('jt-undealt');
            it.animate(
              [
                { transform: 'translateX(90px) rotate(5deg)', opacity: 0 },
                { transform: 'translateX(-6px) rotate(-1deg)', opacity: 1, offset: 0.7 },
                { transform: 'none', opacity: 1 },
              ],
              { duration: 520, delay: i * 110, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
            ).finished.then(() => {
              if (it.classList.contains('jt-item')) {
                count.textContent = ++c;
                count.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
              }
              ring(it);
              sfx.tick();
            });
          });
        }),
      { rootMargin: '0px 0px -15% 0px' },
    );
    shelves.forEach((sh) => io.observe(sh));
  }

  // 2. Lift + tilt + glint (mouse only)
  // 4. Peek: screenshots cross-fade while the pointer rests on a cover
  items.forEach((it) => {
    const cov = it.querySelector('.h-cover');
    let timer = 0;
    it.addEventListener('pointermove', (e) => {
      if (!state.j2 || e.pointerType !== 'mouse') return;
      const r = cov.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      it.style.setProperty('--rx', `${(-(ny - 0.5) * 8).toFixed(2)}deg`);
      it.style.setProperty('--ry', `${((nx - 0.5) * 8).toFixed(2)}deg`);
      cov.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
      cov.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
    });
    it.addEventListener('pointerenter', (e) => {
      if (state.j2 && e.pointerType === 'mouse') sfx.tick();
      const shots = [...it.querySelectorAll('.jt-shot')];
      if (!shots.length) return;
      shots.forEach((s) => s.dataset.src && !s.src && (s.src = s.dataset.src));
      let k = 0;
      const next = () => {
        shots.forEach((s, i) => s.classList.toggle('is-on', i === k % shots.length));
        k++;
      };
      timer = setTimeout(function tick() {
        next();
        timer = setTimeout(tick, 1000);
      }, 450);
    });
    it.addEventListener('pointerleave', () => {
      clearTimeout(timer);
      it.querySelectorAll('.jt-shot').forEach((s) => s.classList.remove('is-on'));
      it.style.removeProperty('--rx');
      it.style.removeProperty('--ry');
    });
    it.addEventListener('pointerdown', () => state.j2 && sfx.press());
  });

  // 5. Car on the sliding shelf (also the road for bulb c)
  let railC = null;
  shelves.forEach((sh) => {
    const road = sh.querySelector('.jt-road');
    if (!road) return;
    const row = sh.querySelector('.h-row');
    const car = road.querySelector('.jt-car');
    let last = 0;
    let lastPuff = 0;
    let atEnd = false;
    const place = (quiet) => {
      const max = row.scrollWidth - row.clientWidth || 1;
      const p = row.scrollLeft / max;
      const x = 8 + p * (road.clientWidth - 42);
      const dir = row.scrollLeft >= last ? 1 : -1;
      last = row.scrollLeft;
      car.style.left = `${x}px`;
      car.style.setProperty('--dir', dir);
      const now = performance.now();
      if (!quiet && state.j5 && now - lastPuff > 60) {
        lastPuff = now;
        puff(road, x + 13 - dir * 16, dir);
      }
      if (p > 0.995 && !atEnd) {
        atEnd = true;
        if (state.j5) {
          car.animate(
            [{ transform: 'rotate(90deg)' }, { transform: 'rotate(90deg) scale(1.3, 0.8)' }, { transform: 'rotate(90deg)' }],
            { duration: 320, easing: 'ease-out' },
          );
          sfx.boing();
        }
      }
      if (p < 0.98) atEnd = false;
      railC?.(x, p, sh);
    };
    row.addEventListener('scroll', () => place(false), { passive: true });
    requestAnimationFrame(() => place(true));
    sh._place = place;
  });

  // a. Empty slot
  if (state.bulb === 'a') {
    const slots = [...view.querySelectorAll('.jt-slot')];
    if (slots.length) {
      const { holder, b } = bulbHolder(56, 'jt-bulb--slot');
      let at = pick(slots);
      let busy = false;
      at.querySelector('.jt-slot__box').append(holder);
      play(b, 'pop-in');
      slots.forEach((s) =>
        s.addEventListener('pointerenter', async () => {
          if (s !== at || busy) return;
          busy = true;
          say('Nope, not a game yet.', { el: holder });
          await play(b, 'laugh');
          sfx.boing();
          await play(b, 'hop-off', { dir: 1 });
          at = pick(slots.filter((x) => x !== at));
          at.querySelector('.jt-slot__box').append(holder);
          sfx.bubbles?.();
          await play(b, 'drop-in');
          busy = false;
        }),
      );
    }
  }

  // b. Hops one cover ahead
  if (state.bulb === 'b') {
    const { holder, b } = bulbHolder(44, 'jt-bulb--perch');
    let i = 0;
    let busy = false;
    items[i].append(holder);
    play(b, 'pop-in');
    items.forEach((it, k) =>
      it.addEventListener('pointerenter', async (e) => {
        if (k !== i || busy) return;
        busy = true;
        say('Hold still!', { x: e.clientX, y: e.clientY - 18 });
        sfx.boing();
        await play(b, 'hop-off', { dir: 1 });
        i = (i + 1) % items.length;
        items[i].append(holder);
        await play(b, 'drop-in');
        busy = false;
      }),
    );
  }

  // c. Rides the slide: runs ahead of the car, jumps off at the end
  if (state.bulb === 'c') {
    const sh = shelves.find((s) => s.querySelector('.jt-road'));
    if (sh) {
      const road = sh.querySelector('.jt-road');
      const nextHead = shelves[shelves.indexOf(sh) + 1]?.querySelector('.e-head');
      const { holder, b } = bulbHolder(40, 'jt-bulb--road');
      let where = 'road';
      let busy = false;
      road.append(holder);
      play(b, 'pop-in');
      railC = async (x, p) => {
        if (where === 'road') holder.style.left = `${Math.min(x + 64, road.clientWidth - 36)}px`;
        if (busy) return;
        if (where === 'road' && p > 0.99 && nextHead) {
          busy = true;
          sfx.boing();
          await play(b, 'hop-off', { dir: 1 });
          holder.style.left = '';
          nextHead.append(holder);
          holder.classList.add('jt-bulb--head');
          where = 'head';
          await play(b, 'drop-in');
          busy = false;
        } else if (where === 'head' && p < 0.6) {
          busy = true;
          await play(b, 'hop-off', { dir: -1 });
          holder.classList.remove('jt-bulb--head');
          road.append(holder);
          where = 'road';
          holder.style.left = `${Math.min(x + 64, road.clientWidth - 36)}px`;
          await play(b, 'pop-in');
          busy = false;
        }
      };
      requestAnimationFrame(() => sh._place(true));
    }
  }
}

// Toolbar, notes, render
const bar = document.querySelector('.lt-bar');
const stageEl = document.querySelector('.lt-stage');
const view = document.querySelector('.lt-view');
const notesEl = document.querySelector('.lt-notes');

bar.innerHTML = `
  <span class="lt-group"><b>Juice</b>${Object.entries(JUICE).map(([k, [n]]) => `<button type="button" data-k="${k}">${n}</button>`).join('')}</span>
  <span class="lt-group"><b>Bulb</b>${Object.entries(BULB).map(([k, [n]]) => `<button type="button" data-k="bulb" data-v="${k}">${n}</button>`).join('')}</span>
  <span class="lt-group"><b>Width</b><button type="button" data-k="width" data-v="desk">Desktop</button><button type="button" data-k="width" data-v="phone">Phone</button></span>
  <span class="lt-group"><b>Covers</b><button type="button" data-k="covers" data-v="off">Grey</button><button type="button" data-k="covers" data-v="on">Real</button></span>
  <span class="lt-group"><button type="button" data-k="sound">Sound</button><button type="button" data-k="replay">Replay</button></span>`;

function render() {
  io?.disconnect();
  stageEl.dataset.width = state.width;
  view.className = `lt-view${state.j2 ? ' jt-j2' : ''}${state.bulb === 'b' ? ' jt-perch' : ''}`;
  view.innerHTML = shelvesHTML();
  wire(view);
  bar.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    const on = k in JUICE ? state[k] : k === 'sound' ? soundOn() : b.dataset.v ? state[k] === b.dataset.v : false;
    b.setAttribute('aria-pressed', String(on));
  });
  const juice = Object.entries(JUICE)
    .filter(([k]) => state[k])
    .map(([, [n, how]]) => `<dt>${n}</dt><dd>${how}</dd>`)
    .join('');
  notesEl.innerHTML = `<h2>Try it</h2><dl>${juice || '<dd>No juice on.</dd>'}<dt>Bulb: ${BULB[state.bulb][0]}</dt><dd>${BULB[state.bulb][1]}</dd></dl>
    <p class="jt-hint">Sound is off until you press "Sound".</p>`;
  history.replaceState(null, '', `?${new URLSearchParams(Object.entries(state).map(([k, v]) => [k, String(v)]))}`);
}

bar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const k = b.dataset.k;
  if (k === 'sound') setSound(!soundOn());
  else if (k === 'replay') {
    scrollTo({ top: 0 });
  } else if (k in JUICE) state[k] = !state[k];
  else state[k] = b.dataset.v;
  render();
});

// 3. Open: click a cover (one listener; the view itself is kept across renders)
view.addEventListener('click', (e) => {
  const item = e.target.closest('.jt-item');
  if (!item) return;
  e.preventDefault();
  if (state.j3) openGame(item);
});

const q = new URLSearchParams(location.search);
for (const k of Object.keys(state)) {
  if (!q.has(k)) continue;
  const v = q.get(k);
  state[k] = k in JUICE ? v === 'true' : v;
}
if (!BULB[state.bulb]) state.bulb = 'a';
render();
