// Small particle burst at a screen point.
import { juicy } from './motion.js';

const COLORS = ['var(--accent)', 'var(--surface)', 'var(--ink)'];

export function burst(x, y, count = 10) {
  if (!juicy()) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'burst-particle';
    const size = 5 + Math.random() * 7;
    p.style.setProperty('--size', `${size}px`);
    p.style.setProperty('--color', COLORS[i % COLORS.length]);
    document.body.appendChild(p);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 40 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const start = `translate(${x - size / 2}px, ${y - size / 2}px)`;

    p.animate(
      [
        { transform: `${start} scale(1)`, opacity: 1 },
        { transform: `${start} translate(${dx}px, ${dy + 18}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: 420 + Math.random() * 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ).onfinish = () => p.remove();
  }
}
