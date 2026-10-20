// Card deck built from games.json: filter tabs, deal-in on first view.
// Layout changes animate with FLIP (measure First, apply, measure Last, Invert, Play).
import data from '../data/games.json';
import { byCategory, primaryCat } from './order.js';
import { initCard } from './card.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { act } from './achievements.js';

const LINK_LABELS = {
  steam: 'Steam',
  appStore: 'App Store',
  googlePlay: 'Google Play',
  itch: 'itch.io',
  gdd: 'Design doc',
  thesis: 'Read thesis',
};
const OUT_MS = 160;
const MOVE_MS = 520;
const DEAL_STAGGER_MS = 45;
const NOTICE_R = 320; // px: cards within this distance lean toward the cursor
const NOTICE_TILT = 7; // degrees at closest

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const rand = (a, b) => a + Math.random() * (b - a);

function cardHTML(g) {
  const platform = g.platforms.join(', ');
  const art = g.media.card
    ? `<img src="${esc(g.media.card)}" alt="${esc(g.title)} cover art" width="800" height="450" loading="lazy" decoding="async"${g.media.focus ? ` style="object-position: ${esc(g.media.focus)}"` : ''} />`
    : `<div class="card__placeholder" aria-hidden="true">${esc(g.title.charAt(0))}</div>`;
  const meta = [g.year, g.status].filter(Boolean).map(esc).join(' · ');
  const tags = (g.roleTags || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const links = Object.entries(g.links)
    .filter(([k, v]) => v && LINK_LABELS[k])
    .map(([k, v]) => `<a class="card__link" href="${esc(v)}" target="_blank" rel="noopener">${LINK_LABELS[k]}</a>`)
    .join('');

  return `
  <article class="card" data-rarity="${g.rarity}" data-cat="${esc(primaryCat(g))}" tabindex="0" role="button" aria-pressed="false"
    aria-label="${esc(g.title)} card. Press to flip.">
    <div class="card__tilt">
      <div class="card__inner">
        <div class="card__face card__front">
          <h3 class="card__name">${esc(g.title)} <span class="card__rarity" aria-hidden="true"></span></h3>
          <div class="card__art">${art}</div>
          <div class="card__type">${esc(platform)} · ${esc(g.genre)}</div>
          <dl class="card__stats">
            <dt>Role</dt><dd>${esc(g.role)}</dd>
          </dl>
        </div>
        <div class="card__face card__back">
          <h3 class="card__name">${esc(g.title)}</h3>
          ${meta ? `<p class="card__meta">${meta}</p>` : ''}
          <p class="card__blurb">${esc(g.blurb)}</p>
          ${tags ? `<p class="card__label">What I did</p><ul class="card__tags">${tags}</ul>` : ''}
          <div class="card__links"><a class="card__link card__more" href="/games/${esc(g.slug)}.html">See more →</a>${links}</div>
        </div>
      </div>
    </div>
  </article>`;
}

export function initDeck(root) {
  const preview = new URLSearchParams(location.search).has('preview');
  const games = byCategory(data.games.filter((g) => preview || !g.hidden));

  const list = root.querySelector('.deck');
  const tabsEl = root.querySelector('.deck-tabs');

  // Cards
  list.innerHTML = games
    .map((g) => `<li class="deck__slot" data-slug="${esc(g.slug)}">${cardHTML(g)}</li>`)
    .join('');
  const slots = [...list.children];
  slots.forEach((slot, i) => {
    const g = games[i];
    slot._game = g;
    initCard(slot.querySelector('.card'));
  });

  // Tabs: only categories that have at least one visible game
  const counts = {};
  for (const g of games) for (const c of g.categories) counts[c] = (counts[c] || 0) + 1;
  const tabs = [{ id: 'all', label: 'All' }, ...data.categories.filter((c) => counts[c.id])];
  tabsEl.innerHTML = tabs
    .map(
      (t) =>
        `<button class="chip" type="button" data-filter="${t.id}" aria-pressed="${t.id === 'all'}">${t.id === 'all' ? '' : `<span class="chip__dot" data-cat="${esc(t.id)}" aria-hidden="true"></span>`}${esc(t.label)}<span class="chip__count">${t.id === 'all' ? games.length : counts[t.id]}</span></button>`,
    )
    .join('');

  let active = 'all';
  let busy = false;
  const matches = (slot, f) => f === 'all' || slot._game.categories.includes(f);

  // Animate every visible slot from where it was to where it is now
  function flip(mutate, { dealIn = [] } = {}) {
    const first = new Map(slots.map((s) => [s, s.hidden ? null : s.getBoundingClientRect()]));
    mutate();
    let k = 0;
    for (const s of list.children) {
      if (s.hidden) continue;
      const f = first.get(s);
      if (dealIn.includes(s) || !f) {
        deal(s, k++);
        continue;
      }
      const l = s.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      s.animate(
        [{ transform: `translate(${dx}px, ${dy}px) rotate(${rand(-4, 4).toFixed(1)}deg)` }, { transform: 'none' }],
        { duration: MOVE_MS, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      );
    }
  }

  function deal(s, i) {
    s.classList.remove('is-undealt');
    if (!juicy()) return;
    s.animate(
      [
        { transform: `translateY(60px) rotate(${rand(-10, 10).toFixed(1)}deg) scale(0.85)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 560, delay: i * DEAL_STAGGER_MS, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' },
    );
  }

  async function setFilter(f) {
    if (f === active || busy) return;
    busy = true;
    active = f;
    tabsEl.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));

    const leaving = slots.filter((s) => !s.hidden && !matches(s, f));
    const arriving = slots.filter((s) => s.hidden && matches(s, f));
    if (juicy() && leaving.length) {
      await Promise.all(
        leaving.map(
          (s) =>
            s.animate(
              [{ transform: 'none', opacity: 1 }, { transform: `scale(0.8) rotate(${rand(-8, 8).toFixed(1)}deg)`, opacity: 0 }],
              { duration: OUT_MS, easing: 'ease-in' },
            ).finished,
        ),
      );
    }
    flip(() => slots.forEach((s) => (s.hidden = !matches(s, f))), { dealIn: arriving });
    busy = false;
  }

  tabsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    sfx.press();
    act(`tab:${chip.dataset.filter}`);
    setFilter(chip.dataset.filter);
  });

  // Cards notice a passing cursor and lean toward it
  let pending = false;
  let px = 0;
  let py = 0;
  const notice = () => {
    pending = false;
    for (const s of slots) {
      if (s.hidden) continue;
      const card = s.querySelector('.card');
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const k = d < NOTICE_R ? (1 - d / NOTICE_R) ** 1.5 : 0;
      card.setLean(-(dy / (d || 1)) * k * NOTICE_TILT, (dx / (d || 1)) * k * NOTICE_TILT);
    }
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !juicy()) return;
      px = e.clientX;
      py = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(notice);
      }
    },
    { passive: true },
  );

  // Hover: card springs up; every other card in the same row slides away
  // from it by the same distance, all at once (no rotation)
  const sameRow = (a, b) => Math.abs(a.offsetTop - b.offsetTop) < 4;
  const clearLift = () => list.querySelectorAll('.is-lifted, .nudge-left, .nudge-right').forEach((el) => el.classList.remove('is-lifted', 'nudge-left', 'nudge-right'));
  list.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !juicy()) return;
    const slot = e.target.closest('.deck__slot');
    if (!slot || slot.classList.contains('is-lifted')) return;
    clearLift();
    slot.classList.add('is-lifted');
    const row = [...list.children].filter((s) => !s.hidden && sameRow(s, slot));
    const i = row.indexOf(slot);
    row.forEach((s, k) => {
      if (k < i) s.classList.add('nudge-left');
      if (k > i) s.classList.add('nudge-right');
    });
  });
  list.addEventListener('pointerleave', clearLift);

  // Deal the whole deck the first time it scrolls into view. Triggered by any
  // part of the deck entering the lower screen edge (minus 10%), not by a share
  // of its height: on phones the deck is a 6000 px column and a share-based
  // threshold could never be reached, leaving the cards invisible.
  if (juicy()) {
    slots.forEach((s) => s.classList.add('is-undealt'));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        slots.filter((s) => !s.hidden).forEach((s, i) => deal(s, i));
        sfx.riffle();
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(list);
  }
}
