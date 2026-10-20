// Easter eggs (no achievements: hidden extras for whoever finds them).
//   Konami code (↑↑↓↓←→←→BA): confetti rain.
//   Typing "juice" anywhere: the whole page does a happy wobble.
//   (Name clicks live in js/namefx.js.)
import { burst } from './burst.js';
import { juicy } from './motion.js';
import { sendShock } from './dotgrid.js';
import { sfx } from './sound.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const WORD = 'juice';

function confetti() {
  sfx.enter();
  if (!juicy()) return;
  for (let i = 0; i < 9; i++) {
    setTimeout(() => burst((innerWidth * (i + 0.5)) / 9, 40, 14), i * 70);
  }
  sendShock(innerWidth / 2, innerHeight / 2, 3, true);
}

function wobble() {
  sfx.boing();
  if (!juicy()) return;
  document.querySelectorAll('main > *, .featured__list > *, .deck > li, .entrance__center').forEach((el, i) =>
    el.animate(
      [
        { transform: 'none' },
        { transform: 'translateY(-10px) scale(1.02, 0.98)' },
        { transform: 'translateY(4px) scale(0.99, 1.01)' },
        { transform: 'none' },
      ],
      { duration: 520, delay: Math.min(i, 12) * 35, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    ),
  );
}

export function initEggs() {
  let k = 0;
  let typed = '';
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, [contenteditable]')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
    if (k === KONAMI.length) {
      k = 0;
      confetti();
    }
    if (e.key.length === 1) {
      typed = (typed + key).slice(-WORD.length);
      if (typed === WORD) {
        typed = '';
        wobble();
      }
    }
  });
}
