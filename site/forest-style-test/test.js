// Forest style test (dev only): pick a style, try and time of day.
// images.js lists the pictures made so far (written by the convert script).
import { images } from './images.js';

const STYLES = { a: 'Flat', b: 'Cel shaded', c: 'Inked' };
// Plain path: Vite rewrites new URL('./img/', import.meta.url) and drops the slash
const dir = '/forest-style-test/img/';

// State lives in the address bar so a view can be shared: ?style=b&time=night
const params = new URLSearchParams(location.search);
const state = {
  style: params.get('style') in STYLES ? params.get('style') : 'a',
  time: params.get('time') === 'night' ? 'night' : 'day',
  take: params.get('take') === '2' ? '2' : '1',
  view: params.get('view') === 'all' ? 'all' : 'one',
};

const one = document.querySelector('.ft-one');
const scene = one.querySelector('.ft-scene');
const missing = one.querySelector('.ft-missing');
const all = document.querySelector('.ft-all');

const key = (s, time, take) => (time === 'night' ? `${s}-night` : `${s}-day-${take}`);

function render() {
  document.querySelectorAll('.ft-bar button').forEach((b) => {
    b.setAttribute('aria-pressed', String(state[b.dataset.k] === b.dataset.v));
  });
  // Night has one picture per style, so "Try" only applies to day
  document.querySelectorAll('[data-k="take"]').forEach((b) => (b.disabled = state.time === 'night' || state.view === 'all'));
  document.querySelectorAll('[data-k="style"], [data-k="time"]').forEach((b) => (b.disabled = state.view === 'all'));
  document.documentElement.dataset.theme = state.time === 'night' && state.view === 'one' ? 'dark' : 'light';

  one.hidden = state.view !== 'one';
  all.hidden = state.view !== 'all';

  const k = key(state.style, state.time, state.take);
  const have = k in images;
  scene.style.backgroundImage = have ? `url(${dir}${k}.webp)` : 'none';
  missing.hidden = have;

  history.replaceState(null, '', `?${new URLSearchParams(state)}`);
}

function buildAll() {
  all.innerHTML = Object.entries(STYLES)
    .map(([s, name]) => {
      const cells = [
        [key(s, 'day', '1'), 'Day, try 1'],
        [key(s, 'day', '2'), 'Day, try 2'],
        [key(s, 'night'), 'Night'],
      ]
        .map(([k, label]) => {
          const pic = k in images
            ? `<img src="${dir}${k}-small.webp" alt="${name}, ${label.toLowerCase()}" loading="lazy" data-key="${k}">`
            : '<div class="ft-empty">Not made yet</div>';
          return `<figure class="ft-cell">${pic}<figcaption>${label}</figcaption></figure>`;
        })
        .join('');
      return `<div class="ft-row"><h2>${name}</h2><div class="ft-cells">${cells}</div></div>`;
    })
    .join('');
}

document.querySelector('.ft-bar').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  state[b.dataset.k] = b.dataset.v;
  render();
});

// Click a picture in the side-by-side view to open it full screen
all.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-key]');
  if (!img) return;
  const [s, time, take] = img.dataset.key.split('-');
  Object.assign(state, { style: s, time, take: take ?? state.take, view: 'one' });
  render();
});

buildAll();
render();
