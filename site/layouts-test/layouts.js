// Layout wireframes for "All games": 7 clean options, real games in the
// site order (order.js). Grey boxes by default; "Real" swaps in the covers.
// Layouts answer to the stage width (container queries), so the Phone
// button only narrows the stage to 390 px.
import './layouts.css';
import data from '../src/data/games.json';
import { byCategory, primaryCat } from '../src/js/order.js';

const games = byCategory(data.games.filter((g) => !g.hidden));
const cats = data.categories
  .map((c) => ({ ...c, games: games.filter((g) => primaryCat(g) === c.id) }))
  .filter((c) => c.games.length);
const catLabel = Object.fromEntries(cats.map((c) => [c.id, c.label]));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = { opt: 'A', width: 'desk', covers: 'off' };

const cover = (g, cls = '') =>
  `<div class="lt-cover ${cls}">${
    state.covers === 'on' ? `<img src="${esc(g.media.card)}" alt="" loading="lazy" />` : `<span>${esc(g.title)}</span>`
  }</div>`;
const meta = (g) => [g.year, g.platforms.join(', '), g.genre].filter(Boolean).map(esc).join(' · ');
const car = (cls = '') => `<span class="lt-car ${cls}" aria-hidden="true"></span>`;
const star = (g) => (g.featured ? '<span class="lt-star" title="Featured">★</span>' : '');

const OPTIONS = {
  A: {
    name: 'Rows',
    notes: {
      'Reach a game': 'Click anywhere on a row.',
      Categories: 'Section headings; the list is grouped.',
      'Car and bulb': 'Car drives down the left edge and parks beside the row you point at.',
      'Weak point': 'Longest on desktop.',
    },
    render: () =>
      `<div class="a-list">${cats
        .map(
          (c) => `<h3 class="lt-cat">${esc(c.label)} <span>${c.games.length}</span></h3>
        ${c.games
          .map(
            (g, i) => `<a class="a-row" href="#">${c === cats[0] && i === 0 ? car('a-car') : ''}${cover(g, 'a-cover')}
              <div class="a-text"><p class="lt-meta">${meta(g)}</p><h4 class="lt-title">${esc(g.title)} ${star(g)}</h4>
              <p class="lt-hook">${esc(g.blurb)}</p><p class="lt-role"><b>My role</b> ${esc(g.role)}</p></div>
              <span class="lt-arrow" aria-hidden="true">→</span></a>`,
          )
          .join('')}`,
        )
        .join('')}</div>`,
  },
  B: {
    name: 'Two columns',
    notes: {
      'Reach a game': 'Click an item.',
      Categories: 'Plain text tabs that filter.',
      'Car and bulb': 'Car parks under the item you point at.',
      'Weak point': 'Still a grid.',
    },
    render: () =>
      `${tabs()}<div class="b-grid">${games
        .map(
          (g, i) => `<a class="b-item" href="#">${cover(g, 'b-cover')}<h4 class="lt-title">${esc(g.title)} ${star(g)}</h4>
          <p class="lt-hook lt-clamp">${esc(g.blurb)}</p><p class="lt-meta">${meta(g)}</p>${i === 0 ? car('b-car') : ''}</a>`,
        )
        .join('')}</div>`,
  },
  C: {
    name: 'Title list',
    notes: {
      'Reach a game': 'Click a title. Pointing shows its cover beside the list.',
      Categories: 'A column on the right; click one to filter.',
      'Car and bulb': 'Car drives up and down the list to the title you point at.',
      'Weak point': 'Phones have no pointer: small covers next to the titles instead.',
    },
    render: () =>
      `<div class="c-wrap"><ol class="c-list">${games
        .map(
          (g, i) => `<li><a class="c-row" href="#" data-i="${i}">${cover(g, 'c-thumb')}<span class="c-title">${esc(g.title)} ${star(g)}</span>
          <span class="c-cat">${esc(catLabel[primaryCat(g)])}</span><span class="c-year">${g.year}</span></a></li>`,
        )
        .join('')}</ol>${car('c-car')}<div class="c-preview">${preview(games[0])}</div></div>`,
    wire(view) {
      const box = view.querySelector('.c-preview');
      const carEl = view.querySelector('.c-car');
      view.querySelectorAll('.c-row').forEach((row) =>
        row.addEventListener('pointerenter', () => {
          box.innerHTML = preview(games[+row.dataset.i]);
          carEl.style.top = `${row.offsetTop + row.offsetHeight / 2 - 13}px`;
        }),
      );
    },
  },
  D: {
    name: 'Bento',
    notes: {
      'Reach a game': 'Click a tile.',
      Categories: 'Small label on each tile, plus text tabs.',
      'Car and bulb': 'Bulb hides in one small tile; the car drives over the tile you point at.',
      'Weak point': 'Tile size must follow a fixed rule (featured big, top games medium), or it looks random.',
    },
    render: () =>
      `${tabs()}<div class="d-grid">${games
        .map((g, i) => {
          const size = g.featured ? 'd-big' : g.rarity === 'legendary' ? 'd-wide' : 'd-small';
          return `<a class="d-tile ${size}" href="#">${cover(g, 'd-cover')}<div class="d-label"><span class="lt-tag">${esc(catLabel[primaryCat(g)])}</span>
            <h4 class="lt-title">${esc(g.title)}</h4></div>${i === 0 ? car('d-car') : ''}</a>`;
        })
        .join('')}</div>`,
  },
  E: {
    name: 'Shelves',
    notes: {
      'Reach a game': 'Click a cover.',
      Categories: 'Each shelf is one category; no tabs needed.',
      'Car and bulb': 'Car drives along a shelf when you slide it.',
      'Weak point': 'Games past the edge stay hidden until you slide.',
    },
    render: () =>
      cats
        .map(
          (c, k) => `<section class="e-shelf"><div class="e-head"><h3 class="lt-cat">${esc(c.label)} <span>${c.games.length}</span></h3>
          <span class="e-arrows" aria-hidden="true">‹ ›</span></div>
          <div class="e-rail">${c.games
            .map(
              (g, i) => `<a class="e-item" href="#">${cover(g, 'e-cover')}<h4 class="lt-title">${esc(g.title)} ${star(g)}</h4>
              <p class="lt-meta">${esc(g.genre)}</p>${k === 2 && i === 0 ? car('e-car') : ''}</a>`,
            )
            .join('')}</div></section>`,
        )
        .join(''),
  },
  F: {
    name: 'Timeline',
    notes: {
      'Reach a game': 'Click a card.',
      Categories: 'Tag on each card. Years are the main order.',
      'Car and bulb': 'The line is the road: the car drives down it as you scroll; the runaway bulb stays a year ahead.',
      'Weak point': '2023 has 5 games and 2025 has 4: they clump.',
    },
    render: () => {
      const years = [...new Set(games.map((g) => g.year))].sort((a, b) => b - a);
      let side = 0;
      return `<div class="f-line">${car('f-car')}${years
        .map(
          (y) => `<div class="f-year"><span>${y}</span></div>${games
            .filter((g) => g.year === y)
            .map(
              (g) => `<a class="f-card f-card--${side++ % 2 ? 'r' : 'l'}" href="#">${cover(g, 'f-cover')}
              <div><span class="lt-tag">${esc(catLabel[primaryCat(g)])}</span><h4 class="lt-title">${esc(g.title)} ${star(g)}</h4>
              <p class="lt-meta">${esc(g.genre)}</p></div></a>`,
            )
            .join('')}`,
        )
        .join('')}</div>`;
    },
  },
  G: {
    name: 'Game menu',
    notes: {
      'Reach a game': 'Point at a tile (phone: tap) to show it big; click again or "Open game".',
      Categories: 'Text tabs above the tile row.',
      'Car and bulb': 'Car drives along under the tiles to the one in focus.',
      'Weak point': 'Shows one game in detail at a time.',
    },
    render: () =>
      `<div class="g-stage">${stage(games[0])}</div>${tabs()}
      <div class="g-row">${games.map((g, i) => `<a class="g-tile${i ? '' : ' is-on'}" href="#" data-i="${i}">${cover(g, 'g-cover')}</a>`).join('')}</div>
      <div class="g-road">${car('g-car')}</div>`,
    wire(view) {
      const st = view.querySelector('.g-stage');
      const carEl = view.querySelector('.g-car');
      const row = view.querySelector('.g-row');
      const focus = (tile) => {
        view.querySelectorAll('.g-tile').forEach((t) => t.classList.toggle('is-on', t === tile));
        st.innerHTML = stage(games[+tile.dataset.i]);
        carEl.style.left = `${tile.offsetLeft - row.scrollLeft + tile.offsetWidth / 2}px`;
      };
      view.querySelectorAll('.g-tile').forEach((t) => t.addEventListener('pointerenter', () => focus(t)));
      requestAnimationFrame(() => focus(view.querySelector('.g-tile')));
    },
  },
};

// H to K: uncropped 16:9 covers, shelf ideas (added after Ahmed picked E)
Object.assign(OPTIONS, {
  H: {
    name: 'Adaptive shelves',
    notes: {
      'Reach a game': 'Click a cover.',
      Categories: 'Each shelf is one category. A shelf only slides when its games do not fit; 2 or 3 games fill the width; 1 game shows its story beside the cover.',
      'Car and bulb': 'Car drives along a sliding shelf when you use the arrows.',
      'Weak point': 'Phone: no sliding, short list per shelf, so covers are small (120 px).',
    },
    render: () =>
      cats
        .map((c) => {
          const n = c.games.length;
          const mode = n === 1 ? 'solo' : n <= 3 ? 'fill' : 'rail';
          const arrows =
            mode === 'rail'
              ? '<span class="h-arrows"><button type="button" data-d="-1" aria-label="Back">‹</button><button type="button" data-d="1" aria-label="More">›</button></span>'
              : '';
          return `<section class="h-shelf h-shelf--${mode}" style="--n: ${n}"><div class="e-head"><h3 class="lt-cat">${esc(c.label)} <span>${n}</span></h3>${arrows}</div>
          <div class="h-row">${c.games
            .map(
              (g, i) => `<a class="h-item" href="#">${cover(g, 'h-cover')}<div class="h-text"><p class="lt-meta h-meta">${meta(g)}</p>
              <h4 class="lt-title">${esc(g.title)} ${star(g)}</h4><p class="lt-meta h-genre">${esc(g.genre)}</p>
              <p class="lt-hook h-hook">${esc(g.blurb)}</p><span class="lt-btn h-btn">Open game →</span></div>${mode === 'rail' && i === 0 ? car('e-car') : ''}</a>`,
            )
            .join('')}</div></section>`;
        })
        .join(''),
    wire(view) {
      view.querySelectorAll('.h-arrows button').forEach((b) =>
        b.addEventListener('click', () => {
          const row = b.closest('.h-shelf').querySelector('.h-row');
          row.scrollBy({ left: +b.dataset.d * row.clientWidth, behavior: 'smooth' });
        }),
      );
    },
  },
  I: {
    name: 'One long shelf',
    notes: {
      'Reach a game': 'Click a cover.',
      Categories: 'Signposts between the groups on one long shelf.',
      'Car and bulb': 'The section pins; scrolling down slides the shelf sideways, so the car drives past every game and signpost.',
      'Weak point': 'Turning vertical scroll into sideways movement can annoy people and is fiddly on phones. Height below = scroll length.',
    },
    render: () =>
      `<div class="i-pin"><div class="i-sticky"><div class="i-track">${cats
        .map(
          (c) => `<div class="i-sign"><span class="i-sign__board">${esc(c.label)} <span>${c.games.length}</span></span></div>${c.games
            .map(
              (g) => `<a class="i-item" href="#">${cover(g, 'i-cover')}<h4 class="lt-title">${esc(g.title)} ${star(g)}</h4><p class="lt-meta">${esc(g.genre)}</p></a>`,
            )
            .join('')}`,
        )
        .join('')}<div class="i-road"></div></div>${car('i-car')}</div></div>`,
    wire(view) {
      const pin = view.querySelector('.i-pin');
      const sticky = view.querySelector('.i-sticky');
      const track = view.querySelector('.i-track');
      const travel = () => Math.max(0, track.offsetWidth - sticky.clientWidth);
      const size = () => {
        pin.style.height = `${sticky.offsetHeight + travel()}px`;
      };
      const onScroll = () => {
        const top = parseFloat(getComputedStyle(sticky).top) || 0;
        const max = pin.offsetHeight - sticky.offsetHeight || 1;
        const p = Math.min(Math.max((top - pin.getBoundingClientRect().top) / max, 0), 1);
        track.style.transform = `translateX(${(-p * travel()).toFixed(1)}px)`;
      };
      size();
      onScroll();
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', size);
      return () => {
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', size);
      };
    },
  },
  J: {
    name: 'Growing shelves',
    notes: {
      'Reach a game': 'Point at a cover: it grows and shows its line and "Open game". Click to open.',
      Categories: 'Each shelf is one category.',
      'Car and bulb': 'Car parks under the cover that grew.',
      'Weak point': 'Each shelf needs room for the grown cover. Phones have no pointer, so nothing grows there.',
    },
    render: () =>
      cats
        .map(
          (c) => `<section class="e-shelf"><div class="e-head"><h3 class="lt-cat">${esc(c.label)} <span>${c.games.length}</span></h3></div>
          <div class="j-rail">${c.games
            .map(
              (g, i) => `<a class="j-item${i ? '' : ' is-grown'}" href="#">${cover(g, 'j-cover')}<h4 class="lt-title">${esc(g.title)} ${star(g)}</h4>
              <div class="j-more"><p class="lt-hook">${esc(g.blurb)}</p><span class="lt-btn">Open game →</span></div></a>`,
            )
            .join('')}${car('j-car')}</div></section>`,
        )
        .join(''),
    wire(view) {
      const park = (item) => {
        const rail = item.parentElement;
        rail.querySelectorAll('.j-item').forEach((it) => it.classList.toggle('is-grown', it === item));
        rail.querySelector('.j-car').style.left = `${item.offsetLeft + 10}px`;
      };
      view.querySelectorAll('.j-item').forEach((it) => it.addEventListener('pointerenter', () => park(it)));
      view.querySelectorAll('.j-rail').forEach((rail) => park(rail.querySelector('.j-item')));
    },
  },
  K: {
    name: 'Spotlight shelves',
    notes: {
      'Reach a game': 'Click the big cover or any row.',
      Categories: 'Each category has a big spotlight plus a short list. Pointing at a row puts that game in the spotlight. A 1-game category is just the spotlight.',
      'Car and bulb': 'Car parks beside the row in the spotlight.',
      'Weak point': 'Two parts to scan per category. Phone: list only (no spotlight), like H.',
    },
    render: () =>
      cats
        .map(
          (c) => `<section class="k-shelf${c.games.length === 1 ? ' k-solo' : ''}"><h3 class="lt-cat">${esc(c.label)} <span>${c.games.length}</span></h3>
          <div class="k-body"><a class="k-spot" href="#">${spot(c.games[0])}</a>${
            c.games.length > 1
              ? `<ol class="k-list">${c.games
                  .map(
                    (g, i) => `<li><a class="k-row${i ? '' : ' is-on'}" href="#" data-slug="${esc(g.slug)}">${cover(g, 'k-thumb')}
                    <span class="k-row__text"><span class="lt-title">${esc(g.title)} ${star(g)}</span><span class="lt-meta">${esc(g.genre)}</span></span></a></li>`,
                  )
                  .join('')}</ol>`
              : ''
          }</div></section>`,
        )
        .join(''),
    wire(view) {
      const carEl = Object.assign(document.createElement('span'), { className: 'lt-car k-car' });
      const pick = (row) => {
        const shelf = row.closest('.k-shelf');
        shelf.querySelectorAll('.k-row').forEach((r) => r.classList.toggle('is-on', r === row));
        shelf.querySelector('.k-spot').innerHTML = spot(games.find((g) => g.slug === row.dataset.slug));
        const list = shelf.querySelector('.k-list');
        list.append(carEl);
        carEl.style.top = `${row.parentElement.offsetTop + row.offsetHeight / 2 - 13}px`;
      };
      view.querySelectorAll('.k-row').forEach((r) => r.addEventListener('pointerenter', () => pick(r)));
      const first = view.querySelector('.k-row');
      if (first) pick(first);
    },
  },
});

function spot(g) {
  return `${cover(g, 'k-cover')}<div class="k-text"><p class="lt-meta">${meta(g)}</p><h4 class="k-title">${esc(g.title)}</h4>
    <p class="lt-hook">${esc(g.blurb)}</p><p class="lt-role"><b>My role</b> ${esc(g.role)}</p><span class="lt-btn">Open game →</span></div>`;
}

function tabs() {
  return `<div class="lt-tabs"><span class="is-on">All</span>${cats.map((c) => `<span>${esc(c.label)}</span>`).join('')}</div>`;
}

function preview(g) {
  return `${cover(g, 'c-big')}<p class="lt-meta">${meta(g)}</p><h4 class="lt-title">${esc(g.title)}</h4><p class="lt-hook">${esc(g.blurb)}</p>`;
}

function stage(g) {
  return `${cover(g, 'g-back')}<div class="g-info"><p class="lt-meta">${meta(g)}</p><h4 class="g-title">${esc(g.title)}</h4>
    <p class="lt-hook">${esc(g.blurb)}</p><span class="lt-btn">Open game →</span></div>`;
}

// Toolbar
const bar = document.querySelector('.lt-bar');
bar.querySelector('.lt-opts').innerHTML = Object.entries(OPTIONS)
  .map(([k, o]) => `<button type="button" data-k="opt" data-v="${k}">${k} ${o.name}</button>`)
  .join('');

const stageEl = document.querySelector('.lt-stage');
const view = document.querySelector('.lt-view');
const notesEl = document.querySelector('.lt-notes');

let cleanup = null;
function render() {
  const o = OPTIONS[state.opt];
  cleanup?.();
  stageEl.dataset.width = state.width;
  view.className = `lt-view lt-view--${state.opt}`;
  view.innerHTML = o.render();
  cleanup = o.wire?.(view) || null;
  bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(state[b.dataset.k] === b.dataset.v)));
  requestAnimationFrame(() => {
    notesEl.innerHTML = `<h2>${state.opt}. ${o.name}</h2><dl>${Object.entries(o.notes)
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join('')}<dt>Height</dt><dd>${Math.round(view.offsetHeight)} px at this width</dd></dl>`;
  });
  const q = new URLSearchParams(state);
  history.replaceState(null, '', `?${q}`);
}

bar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state[b.dataset.k] = b.dataset.v;
  render();
});
view.addEventListener('click', (e) => {
  if (e.target.closest('a')) e.preventDefault();
});

const q = new URLSearchParams(location.search);
for (const k of Object.keys(state)) if (q.get(k)) state[k] = q.get(k);
if (!OPTIONS[state.opt]) state.opt = 'A';
render();
