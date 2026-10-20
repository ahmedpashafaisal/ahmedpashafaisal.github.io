// Scroll bar as a road: the ink car from the landing drives down the right
// edge as you scroll, turns around when you scroll back up, and puffs smoke
// while moving. Drag the car to scroll; click the road to jump there.
// Mouse screens only (the native bar is hidden there); touch keeps its own.
import { juicy } from './motion.js';
import { act } from './achievements.js';

const CAR = `
<svg viewBox="0 0 20 32" width="26" height="42" aria-hidden="true">
  <rect x="0.5" y="5" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="15.5" y="5" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="0.5" y="20" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="15.5" y="20" width="4" height="7" rx="1.5" fill="var(--ink-soft)"/>
  <rect x="3" y="1.5" width="14" height="29" rx="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1.5"/>
  <rect x="5.5" y="9" width="9" height="11" rx="2.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="5" y="2.8" width="3" height="1.8" rx="0.9" fill="#caff00"/>
  <rect x="12" y="2.8" width="3" height="1.8" rx="0.9" fill="#caff00"/>
</svg>`;

const PUFF_MS = 110;

export function initScrollCar() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const html = document.documentElement;
  html.classList.add('has-scrollcar');

  const road = document.createElement('div');
  road.className = 'scrollcar';
  road.innerHTML = `<div class="scrollcar__line"></div><div class="scrollcar__car" role="scrollbar" aria-label="Page scroll" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" tabindex="-1">${CAR}</div>`;
  document.body.appendChild(road);
  const car = road.querySelector('.scrollcar__car');

  let lastY = scrollY;
  let facingDown = true;
  let lastPuff = 0;
  let stopTimer = 0;
  let dragging = false;

  const max = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const travel = () => road.clientHeight - car.offsetHeight;

  function place() {
    const k = Math.min(1, Math.max(0, scrollY / max()));
    car.style.translate = `0 ${(k * travel()).toFixed(1)}px`;
    car.setAttribute('aria-valuenow', String(Math.round(k * 100)));
    road.classList.toggle('is-hidden', max() < 40);
  }

  function puff() {
    const r = car.getBoundingClientRect();
    const p = document.createElement('span');
    p.className = 'scrollcar__puff';
    // Smoke leaves from the back of the car
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${facingDown ? r.top - 2 : r.bottom + 2}px`;
    document.body.appendChild(p);
    const dir = facingDown ? -1 : 1;
    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.7 },
        { transform: `translate(-50%, calc(-50% + ${dir * 14}px)) scale(1.4)`, opacity: 0 },
      ],
      { duration: 520, easing: 'ease-out' },
    ).onfinish = () => p.remove();
  }

  window.addEventListener(
    'scroll',
    () => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      place();
      if (!dy) return;
      const down = dy > 0;
      if (down !== facingDown) {
        facingDown = down;
        car.classList.toggle('is-up', !down);
      }
      car.classList.add('is-driving');
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => car.classList.remove('is-driving'), 160);
      const now = performance.now();
      if (juicy() && now - lastPuff > PUFF_MS) {
        lastPuff = now;
        puff();
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', place);
  new ResizeObserver(place).observe(document.body);
  place();

  // Drag the car like a scrollbar thumb
  car.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    car.setPointerCapture(e.pointerId);
    dragging = true;
    car.classList.add('is-held');
    const startY = e.clientY;
    const startScroll = scrollY;
    const move = (ev) => {
      if (!dragging) return;
      window.scrollTo(0, startScroll + ((ev.clientY - startY) / Math.max(1, travel())) * max());
    };
    const end = () => {
      dragging = false;
      car.classList.remove('is-held');
      car.removeEventListener('pointermove', move);
      if (Math.abs(scrollY - startScroll) > innerHeight) act('drive');
    };
    car.addEventListener('pointermove', move);
    car.addEventListener('pointerup', end, { once: true });
    car.addEventListener('pointercancel', end, { once: true });
  });

  // Click the road: drive there
  road.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.scrollcar__car')) return;
    const r = road.getBoundingClientRect();
    const k = (e.clientY - r.top - car.offsetHeight / 2) / Math.max(1, travel());
    window.scrollTo({ top: Math.min(1, Math.max(0, k)) * max(), behavior: juicy() ? 'smooth' : 'auto' });
  });
}
