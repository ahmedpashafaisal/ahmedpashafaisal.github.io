// Card: pointer tilt with smoothing, glint + foil follow, press squash,
// juicy flip (lift, turn, land with squash and a shadow thump), idle float in CSS.
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';

const MAX_TILT = 10; // degrees
const SMOOTH = 0.18; // lerp factor per frame
const FLIP_MS = 640;

export function initCard(card) {
  const inner = card.querySelector('.card__inner');
  const ground = document.createElement('span');
  ground.className = 'card__ground';
  ground.setAttribute('aria-hidden', 'true');
  card.prepend(ground);

  const target = { rx: 0, ry: 0 };
  const cur = { rx: 0, ry: 0 };
  let raf = 0;
  let angle = 0;
  let flipping = false;

  const tick = () => {
    cur.rx += (target.rx - cur.rx) * SMOOTH;
    cur.ry += (target.ry - cur.ry) * SMOOTH;
    card.style.setProperty('--rx', `${cur.rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${cur.ry.toFixed(2)}deg`);
    const done = Math.abs(target.rx - cur.rx) + Math.abs(target.ry - cur.ry) < 0.02;
    raf = done ? 0 : requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !juicy()) return;
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width; // 0..1
    const ny = (e.clientY - r.top) / r.height;
    target.ry = (nx - 0.5) * 2 * MAX_TILT;
    target.rx = -(ny - 0.5) * 2 * MAX_TILT;
    card.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
    wake();
  });

  card.addEventListener('pointerleave', () => {
    target.rx = target.ry = 0;
    card.classList.remove('is-pressed');
    wake();
  });

  const flip = () => {
    if (flipping) return;
    const from = angle;
    angle += 180;
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
    inner.style.setProperty('--flip', `${angle}deg`);
    if (!juicy()) return;

    flipping = true;
    const to = angle;
    const k = (ty, deg, sx = 1, sy = sx) => `translateY(${ty}px) rotateY(${deg}deg) scale(${sx}, ${sy})`;
    inner
      .animate(
        [
          { transform: k(0, from), easing: 'cubic-bezier(0.3, 0, 0.4, 1)' },
          { transform: k(-28, from + 70, 1.05), offset: 0.3 },
          { transform: k(-28, to - 10, 1.05), offset: 0.62, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
          { transform: k(0, to + 5, 1.07, 0.93), offset: 0.8 },
          { transform: k(0, to - 2, 0.98, 1.02), offset: 0.9 },
          { transform: k(0, to) },
        ],
        { duration: FLIP_MS },
      )
      .finished.then(() => {
        flipping = false;
      });

    ground.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.72)', opacity: 0.45, offset: 0.3 },
        { transform: 'scale(0.72)', opacity: 0.45, offset: 0.62 },
        { transform: 'scale(1.18)', opacity: 1.3, offset: 0.8 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: FLIP_MS, easing: 'ease-in-out' },
    );

    // Landing thump ripples through the dot grid
    setTimeout(() => {
      const r = card.getBoundingClientRect();
      sendShock(r.left + r.width / 2, r.bottom, 0.6);
      sfx.thump();
    }, FLIP_MS * 0.8);
  };

  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a')) return;
    card.classList.add('is-pressed');
  });
  card.addEventListener('pointerup', () => card.classList.remove('is-pressed'));
  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    flip();
  });
  card.addEventListener('keydown', (e) => {
    if (e.target !== card) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flip();
    }
  });
}
