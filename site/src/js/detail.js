// "See more" page for one game, rendered from games.json.
// Fixed order on every page so all games feel like one family:
//   hero (text + screenshot slider) → my role → what I did → video → prev/next
// A section with no data is skipped; the order never changes.
import data from '../data/games.json';
import { byCategory, primaryCat } from './order.js';
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { sendShock } from './dotgrid.js';
import { act } from './achievements.js';
import { STORE_ICONS } from './storeicons.js';

const LINKS = {
  steam: 'Steam',
  appStore: 'App Store',
  googlePlay: 'Google Play',
  itch: 'Play on itch.io',
  thesis: 'Read the thesis',
};
const SHOT_MS = 3600;
const STAGGER_MS = 110;
const TILT = 4; // degrees, hover lean

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const letters = (text) =>
  text
    .split(' ')
    .map((w) => `<span class="banner__word" aria-hidden="true">${[...w].map((c) => `<span class="banner__letter">${esc(c)}</span>`).join('')}</span>`)
    .join(' ');

// Same order as the deck
const ordered = () => byCategory(data.games.filter((g) => !g.hidden));

/* ---------- sections ---------- */

function hero(g) {
  // linkLabels in games.json overrides a button label (e.g. a physical game: "View on itch.io")
  const label = (k) => esc(g.linkLabels?.[k] || LINKS[k]);
  // The first link is the big button. Phone stores are equals (a visitor picks
  // by the phone they own), so every store link gets the big button too.
  const links = Object.entries(g.links)
    .filter(([k, v]) => v && LINKS[k])
    .map(([k, v], i) => {
      const icon = STORE_ICONS[k] || '';
      return i === 0 || icon
        ? `<a class="juicy-btn page__cta${icon ? ' store-link' : ''}" href="${esc(v)}" target="_blank" rel="noopener">${icon}${label(k)} ↗</a>`
        : `<a class="card__link" href="${esc(v)}" target="_blank" rel="noopener">${label(k)}</a>`;
    })
    .join('');
  // A paper prototype reads as itself, not "Built with Paper prototype"
  const built = g.builtWith?.length ? (/prototype/i.test(g.builtWith[0]) ? g.builtWith.join(', ') : `Built with ${g.builtWith.join(', ')}`) : '';
  const facts = [g.year, g.platforms?.join(', '), g.genre, built, g.status].filter(Boolean);
  return `
  <header class="page__hero page__part">
    <div class="page__intro">
      <h1 class="page__title" aria-label="${esc(g.title)}">${letters(g.title)}</h1>
      <p class="page__desc">${esc(g.description || g.blurb)}</p>
      ${links ? `<div class="banner__actions">${links}</div>` : ''}
      ${facts.length ? `<ul class="page__facts" aria-label="Facts">${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    </div>
    ${slider(g)}
  </header>`;
}

// Each screenshot's small copy for the strip (scripts/make-thumbs.py):
// /img/shots/<game>/<n>.webp -> /img/shots/<game>/thumbs/<n>.webp
const thumb = (src) => src.replace(/\/([^/]+)\.\w+$/, '/thumbs/$1.webp');

// Screenshot slider: big view + thumbnails. Falls back to the cover, then to a placeholder.
function slider(g) {
  const shots = g.media.shots || [];
  const tall = g.media.orientation === 'portrait';
  if (!shots.length) {
    const inner = g.media.card
      ? `<img class="banner__shot is-active" src="${esc(g.media.card)}" alt="${esc(g.title)} cover art" />`
      : `<div class="card__placeholder page__placeholder" aria-hidden="true">${esc(g.title.charAt(0))}</div>`;
    return `<div class="page__media"><div class="page__screen page__screen--static">${inner}</div></div>`;
  }
  return `
    <div class="page__media${tall ? ' page__media--phone' : ''}" ${tall ? `style="--backdrop: url('${esc(g.media.card)}')"` : ''}>
      <button class="page__screen" type="button" aria-label="Open screenshots">
        ${shots.map((s, i) => `<img class="banner__shot${i === 0 ? ' is-active' : ''}" ${i ? 'data-src' : 'src'}="${esc(s)}" alt="${esc(g.title)} screenshot ${i + 1}" decoding="async" />`).join('')}
      </button>
      ${
        shots.length > 1
          ? `<div class="page__thumbs" role="tablist" aria-label="Screenshots">${shots
              .map((s, i) => `<button class="page__thumb${i === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${i === 0}" data-i="${i}" aria-label="Screenshot ${i + 1}"><img src="${esc(thumb(s))}" alt="" loading="lazy" /></button>`)
              .join('')}</div>`
          : ''
      }
    </div>`;
}

function role(g) {
  if (!g.role) return '';
  const tags = (g.roleTags || []).map((t) => `<li>${esc(t)}</li>`).join('');
  return `
  <section class="page__section page__role page__part" aria-labelledby="role-title">
    <h2 id="role-title" class="page__label">My role</h2>
    <div>
      <p class="page__rolebig">${esc(g.role)}</p>
      ${tags ? `<ul class="card__tags">${tags}</ul>` : ''}
    </div>
  </section>`;
}

function did(g) {
  const blocks = g.contributions || [];
  if (!blocks.length) return '';
  const tile = (b) => {
    const front = `
      <h3 class="page__h3">${esc(b.title)}</h3>
      ${b.bullets?.length ? `<ul class="card__tags">${b.bullets.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    if (!b.text) return `<article class="page__did"><div class="tile__face">${front}</div></article>`;
    return `
      <div class="page__did tile--flip" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(b.title)}: press to flip for notes">
        <div class="tile__inner">
          <div class="tile__face">${front}<span class="tile__hint" aria-hidden="true">↻ flip</span></div>
          <div class="tile__face tile__back"><h3 class="page__h3">${esc(b.title)}</h3><p>${esc(b.text)}</p></div>
        </div>
      </div>`;
  };
  return `
  <section class="page__section page__part" aria-labelledby="did-title">
    <h2 id="did-title" class="page__label">What I did</h2>
    <div class="page__dids">${blocks.map(tile).join('')}</div>
  </section>`;
}

// YouTube id, or a self-hosted clip (media.video = { src, poster }).
// Both show a poster + play button until clicked.
function video(g) {
  const id = g.media.youtube;
  const clip = g.media.video;
  if (!id && !clip) return '';
  if (clip) {
    const tall = g.orientation === 'portrait' || g.media.orientation === 'portrait';
    return `
  <section class="page__section page__part" aria-labelledby="video-title">
    <h2 id="video-title" class="page__label">Video</h2>
    <button class="page__video${tall ? ' page__video--tall' : ''}" type="button" data-src="${esc(clip.src)}" aria-label="Play ${esc(g.title)} video">
      <img src="${esc(clip.poster)}" alt="" loading="lazy" />
      <span class="detail__play" aria-hidden="true">▶</span>
    </button>
  </section>`;
  }
  return `
  <section class="page__section page__part" aria-labelledby="video-title">
    <h2 id="video-title" class="page__label">Video</h2>
    <button class="page__video" type="button" data-yt="${esc(id)}" aria-label="Play ${esc(g.title)} video">
      <img src="https://i.ytimg.com/vi/${esc(id)}/maxresdefault.jpg" alt="" loading="lazy"
        onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg'" />
      <span class="detail__play" aria-hidden="true">▶</span>
    </button>
  </section>`;
}

// Prev / next: own row, always two identical buttons
function nav(g) {
  const list = ordered();
  const i = list.findIndex((x) => x.slug === g.slug);
  const link = (x, dir) => `
    <a class="page__nav page__nav--${dir}" data-cat="${esc(primaryCat(x))}" href="/games/${esc(x.slug)}.html">
      <span class="page__navthumb" aria-hidden="true">${x.media.card ? `<img src="${esc(x.media.card)}" alt="" loading="lazy" />` : esc(x.title.charAt(0))}</span>
      <span class="page__navtext">
        <span class="page__label">${dir === 'next' ? 'Next' : 'Previous'}</span>
        <span class="page__navtitle">${esc(x.title)}</span>
      </span>
      <span class="page__arrow" aria-hidden="true">${dir === 'next' ? '→' : '←'}</span>
    </a>`;
  return `
  <nav class="page__navrow page__part" aria-label="More games">
    ${link(list[(i - 1 + list.length) % list.length], 'prev')}
    ${link(list[(i + 1) % list.length], 'next')}
  </nav>`;
}

/* ---------- lightbox ---------- */

function lightbox(shots, title) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', `${title} screenshots`);
  box.innerHTML = `
    <img class="lightbox__img" alt="" />
    <button class="chip lightbox__btn lightbox__prev" type="button" aria-label="Previous">←</button>
    <button class="chip lightbox__btn lightbox__next" type="button" aria-label="Next">→</button>
    <button class="chip lightbox__btn lightbox__close" type="button" aria-label="Close">✕</button>`;
  document.body.appendChild(box);
  const img = box.querySelector('img');
  let i = 0;
  let opener = null;
  const show = (k, dir = 0) => {
    i = (k + shots.length) % shots.length;
    img.src = shots[i];
    img.alt = `${title} screenshot ${i + 1}`;
    if (juicy()) {
      img.animate(
        [{ transform: `translateX(${dir * 40}px) scale(${dir ? 1 : 0.85})`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      );
    }
  };
  const close = () => {
    box.hidden = true;
    document.documentElement.style.overflow = '';
    opener?.focus();
  };
  box.querySelector('.lightbox__prev').addEventListener('click', () => show(i - 1, -1));
  box.querySelector('.lightbox__next').addEventListener('click', () => show(i + 1, 1));
  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.addEventListener('click', (e) => e.target === box && close());
  window.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(i - 1, -1);
    if (e.key === 'ArrowRight') show(i + 1, 1);
  });
  return (k, from) => {
    opener = from;
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    show(k);
    sfx.boing();
    box.querySelector('.lightbox__close').focus();
  };
}

/* ---------- juice helpers ---------- */

export function lean(el) {
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !juicy()) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.transform = `perspective(900px) translateY(-3px) rotateX(${(-y * TILT).toFixed(2)}deg) rotateY(${(x * TILT).toFixed(2)}deg)`;
  });
  el.addEventListener('pointerleave', () => (el.style.transform = ''));
}

/* ---------- page ---------- */

export function initDetail(root) {
  const g = data.games.find((x) => x.slug === root.dataset.slug);
  if (!g) return;
  root.insertAdjacentHTML('beforeend', hero(g) + role(g) + did(g) + video(g) + nav(g));

  // Slider: auto-advance with a punch, thumbnails jump, big view opens the lightbox.
  // The screenshots are stacked in the frame, so the browser would fetch them
  // all at once: only the first has its src; each other one gets it when it
  // is next in line (the first one loaded) or jumped to.
  const shots = g.media.shots || [];
  const screen = root.querySelector('.page__screen:not(.page__screen--static)');
  if (screen && shots.length) {
    const imgs = [...screen.querySelectorAll('img')];
    const thumbs = [...root.querySelectorAll('.page__thumb')];
    const open = lightbox(shots, g.title);
    let i = 0;
    let timer = 0;
    const fetchShot = (k) => {
      const im = imgs[k % imgs.length];
      if (!im?.dataset.src) return;
      im.src = im.dataset.src;
      delete im.dataset.src;
    };
    if (imgs[0].complete) fetchShot(1);
    else imgs[0].addEventListener('load', () => fetchShot(1), { once: true });
    const go = (k, punch = true) => {
      imgs[i].classList.remove('is-active');
      thumbs[i]?.classList.remove('is-active');
      thumbs[i]?.setAttribute('aria-selected', 'false');
      i = (k + imgs.length) % imgs.length;
      fetchShot(i);
      fetchShot(i + 1);
      imgs[i].classList.add('is-active');
      thumbs[i]?.classList.add('is-active');
      thumbs[i]?.setAttribute('aria-selected', 'true');
      if (punch && juicy()) screen.animate([{ transform: 'scale(0.97)' }, { transform: 'scale(1.01)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
    };
    const restart = () => {
      clearInterval(timer);
      if (juicy() && imgs.length > 1) timer = setInterval(() => go(i + 1), SHOT_MS);
    };
    thumbs.forEach((t) =>
      t.addEventListener('click', () => {
        go(+t.dataset.i);
        sfx.press();
        restart();
      }),
    );
    screen.addEventListener('click', () => open(i, screen));
    restart();
  }

  // Video: thumbnail until clicked
  root.querySelector('.page__video')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    act('video');
    if (btn.dataset.src) {
      const v = document.createElement('video');
      v.src = btn.dataset.src;
      v.poster = btn.querySelector('img').src;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('aria-label', `${g.title} video`);
      v.className = btn.className + ' page__clip';
      btn.replaceWith(v);
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${e.currentTarget.dataset.yt}?autoplay=1&rel=0`;
    frame.title = `${g.title} video`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.className = 'page__video page__iframe';
    e.currentTarget.replaceWith(frame);
  });

  pageFx(root);
}

// Shared by game pages and About: flip tiles, hover lean,
// sections dealing in, media slam, title letter bounce.
export function pageFx(root) {
  // Flip tiles
  root.querySelectorAll('.tile--flip').forEach((t) => {
    const flip = () => {
      t.setAttribute('aria-pressed', String(t.classList.toggle('is-flipped')));
      sfx.press();
    };
    t.addEventListener('click', flip);
    t.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });
  });

  root.querySelectorAll('.page__media, .page__did').forEach(lean);

  if (!juicy()) return;

  // Sections deal in one after another; the media slams with a thump.
  // About hides them before the first paint (parts-hidden, inline script in
  // about.html); the animations hold them hidden through their delays, so
  // the class can go now.
  document.documentElement.classList.remove('parts-hidden');
  root.querySelectorAll('.page__part').forEach((el, k) => {
    el.animate([{ transform: 'translateY(28px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 520,
      delay: k * STAGGER_MS,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'backwards',
    });
  });
  const media = root.querySelector('.page__media');
  if (media) {
    media.animate(
      [
        { transform: 'translateY(-80px) rotate(-2deg) scale(1.04)', opacity: 0 },
        { transform: 'translateY(0) scale(1.04, 0.92)', opacity: 1, offset: 0.62 },
        { transform: 'scale(0.99, 1.02)', offset: 0.82 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 560, delay: 120, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'backwards' },
    );
    setTimeout(() => {
      const r = media.getBoundingClientRect();
      sendShock(r.left + r.width / 2, r.bottom, 1.2);
      sfx.thump();
    }, 120 + 560 * 0.62);
  }
  root.querySelectorAll('.page__title .banner__letter').forEach((l, k) =>
    l.animate(
      [
        { transform: 'translateY(0.7em) scale(1, 0.3)', opacity: 0 },
        { transform: 'translateY(-0.12em) scale(1, 1.15)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 460, delay: 80 + k * 26, easing: 'ease-out', fill: 'backwards' },
    ),
  );
}
