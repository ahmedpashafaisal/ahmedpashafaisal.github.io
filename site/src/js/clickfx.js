// Click effect for the game cursor (mouse only): while the button is held
// the hand swaps to a smaller "pressed" hand, and each click pops a small
// ring out of the fingertip. Reduced motion keeps the swap, skips the ring.
import { juicy } from './motion.js';

export function initClickFx() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const html = document.documentElement;

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    html.classList.add('is-clicking');
    if (!juicy()) return;
    const ring = document.createElement('span');
    ring.className = 'click-ring';
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    document.body.appendChild(ring);
    ring.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ).onfinish = () => ring.remove();
  });
  const up = () => html.classList.remove('is-clicking');
  window.addEventListener('pointerup', up);
  window.addEventListener('blur', up);
}
