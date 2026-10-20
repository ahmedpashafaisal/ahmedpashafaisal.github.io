// Featured banners: one full-width banner per visible Legendary game.
// Screenshots cross-fade with a slow pan (Ken Burns) while the banner is on
// screen; the media leans toward the cursor; the title lands with a squash.
import data from '../data/games.json';
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';

const SHOT_MS = 3800; // time per screenshot
const MAX_TILT = 5; // degrees
const STAGGER_MS = 80; // gap between banner parts appearing
const SLAM_MS = 560;
const LETTER_MS = 26; // gap between title letters
const STORE = { steam: 'Steam', appStore: 'App Store', googlePlay: 'Google Play', itch: 'itch.io', gdd: 'Design doc' };

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Title split into letters (aria-hidden; the h3 keeps an aria-label)
const letters = (text) =>
  text
    .split(' ')
    .map((w) => `<span class="banner__word" aria-hidden="true">${[...w].map((c) => `<span class="banner__letter">${esc(c)}</span>`).join('')}</span>`)
    .join(' ');

function bannerHTML(g, i) {
  const portrait = g.media.orientation === 'portrait';
  const shots = (g.media.shots || [])
    .map(
      (src, k) =>
        // data-src, not src: the browser fetches lazy images far ahead of the
        // screen, which starves the landing car. The observer below sets src.
        `<img class="banner__shot${k === 0 ? ' is-active' : ''}" data-src="${esc(src)}" alt="${esc(g.title)} screenshot ${k + 1}" decoding="async"${g.media.focus && k === 0 ? ` style="object-position: ${esc(g.media.focus)}"` : ''} />`,
    )
    .join('');
  const links = Object.entries(g.links)
    .filter(([k, v]) => v && STORE[k])
    .map(([k, v]) => `<a class="card__link" href="${esc(v)}" target="_blank" rel="noopener">${STORE[k]}</a>`)
    .join('');
  const meta = [g.year, g.platforms.join(', '), g.genre].filter(Boolean).map(esc).join(' · ');

  const media = portrait
    ? `<div class="banner__media banner__media--phone" style="--backdrop: url('${esc(g.media.card)}')">
         <div class="banner__phone">${shots}</div>
       </div>`
    : `<div class="banner__media banner__media--wide">${shots || '<div class="card__placeholder banner__placeholder" aria-hidden="true">' + esc(g.title.charAt(0)) + '</div>'}</div>`;

  return `
  <article class="banner${i % 2 ? ' banner--flip' : ''}" aria-labelledby="banner-${esc(g.slug)}">
    <div class="banner__lean">${media}</div>
    <div class="banner__text">
      <p class="banner__meta">${meta}</p>
      <h3 class="banner__title" id="banner-${esc(g.slug)}" aria-label="${esc(g.title)}">${letters(g.title)}</h3>
      <p class="banner__hook">${esc(g.blurb)}</p>
      <p class="banner__role"><strong>My role</strong> ${esc(g.role)}</p>
      <div class="banner__actions">
        <a class="juicy-btn banner__cta" href="/games/${esc(g.slug)}.html">See more →</a>
        ${links}
      </div>
    </div>
  </article>`;
}

// Staggered entrance: media slams in, then meta, title (letter by letter),
// hook, role and buttons follow one after another.
function appear(banner) {
  banner.classList.remove('is-waiting');
  if (!juicy()) return;
  const media = banner.querySelector('.banner__media');
  const parts = [...banner.querySelector('.banner__text').children];

  media.animate(
    [
      { transform: 'translateY(-90px) rotate(-2deg) scale(1.04)', opacity: 0 },
      { transform: 'translateY(0) rotate(0) scale(1.04, 0.92)', opacity: 1, offset: 0.62 },
      { transform: 'scale(0.99, 1.02)', offset: 0.82 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: SLAM_MS, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'backwards' },
  );
  // Landing thump
  setTimeout(() => {
    const r = media.getBoundingClientRect();
    sendShock(r.left + r.width / 2, r.bottom, 1.3);
    sfx.thump();
  }, SLAM_MS * 0.62);

  parts.forEach((el, i) => {
    const delay = SLAM_MS * 0.45 + i * STAGGER_MS;
    if (el.classList.contains('banner__title')) {
      el.querySelectorAll('.banner__letter').forEach((l, k) =>
        l.animate(
          [
            { transform: 'translateY(0.7em) scale(1, 0.3)', opacity: 0 },
            { transform: 'translateY(-0.12em) scale(1, 1.15)', opacity: 1, offset: 0.6 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 460, delay: delay + k * LETTER_MS, easing: 'ease-out', fill: 'backwards' },
        ),
      );
      return;
    }
    el.animate(
      [
        { transform: 'translateY(18px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 420, delay, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' },
    );
  });
}

export function initFeatured(root) {
  // ?preview shows hidden entries (e.g. Storm Alert before it is cleared)
  const preview = new URLSearchParams(location.search).has('preview');
  const games = data.games
    .filter((g) => g.featured && (preview || !g.hidden))
    .sort((a, b) => a.featured - b.featured);
  const list = root.querySelector('.featured__list');
  const SEP = '<div class="banner-sep" aria-hidden="true"><span class="banner-sep__gem"></span></div>';
  list.innerHTML = games.map(bannerHTML).join(SEP);

  // Separator gem pops when it scrolls in
  const sepIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      sepIO.unobserve(e.target);
      if (!juicy()) continue;
      e.target.querySelector('.banner-sep__gem').animate(
        [
          { transform: 'rotate(45deg) scale(0)' },
          { transform: 'rotate(225deg) scale(1.4)', offset: 0.6 },
          { transform: 'rotate(225deg) scale(1)' },
        ],
        { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' },
      );
    }
  }, { threshold: 1 });
  list.querySelectorAll('.banner-sep').forEach((s) => sepIO.observe(s));

  if (juicy()) list.querySelectorAll('.banner').forEach((b) => b.classList.add('is-waiting'));

  for (const banner of list.querySelectorAll('.banner')) {
    const shots = [...banner.querySelectorAll('.banner__shot')];
    const lean = banner.querySelector('.banner__lean');
    const title = banner.querySelector('.banner__title');
    let timer = 0;
    let index = 0;
    let landed = false;

    const next = () => {
      shots[index].classList.remove('is-active');
      index = (index + 1) % shots.length;
      shots[index].classList.add('is-active');
    };

    // First screenshot loads just before the banner scrolls into view; the
    // rest (only needed for the cross-fade) once it is on screen
    const load = (s) => {
      if (!s.getAttribute('src')) s.src = s.dataset.src;
    };
    if (shots.length) {
      new IntersectionObserver(
        ([entry], obs) => {
          if (!entry.isIntersecting) return;
          load(shots[0]);
          obs.disconnect();
        },
        { rootMargin: '400px 0px' },
      ).observe(banner);
    }

    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          shots.forEach(load);
          if (juicy() && shots.length > 1 && !timer) timer = setInterval(next, SHOT_MS);
          if (!landed) {
            landed = true;
            appear(banner);
          }
        } else if (timer) {
          clearInterval(timer);
          timer = 0;
        }
      },
      { threshold: 0.2 },
    ).observe(banner);

    // Lean toward the cursor
    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      lean.style.transform = `perspective(1100px) rotateX(${cur.y.toFixed(2)}deg) rotateY(${cur.x.toFixed(2)}deg)`;
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    banner.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !juicy()) return;
      const r = lean.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2 * MAX_TILT;
      target.y = -((e.clientY - r.top) / r.height - 0.5) * 2 * MAX_TILT;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    banner.addEventListener('pointerleave', () => {
      target.x = target.y = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }
}
