// Calm parallax between the entrance and the games, scrubbed by scroll.
// Sets --p on <html> (0 = entrance fully in view, 1 = scrolled past it) and
// --q on the games section (0 = below the fold, 1 = top reached), and fires
// `scroll:progress` with p for the 3D shapes. Flat with reduced motion.
import { juicy } from './motion.js';

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

export function initScrollTransition(entrance, games) {
  const html = document.documentElement;
  let ticking = false;

  function update() {
    ticking = false;
    let p = 0;
    let q = 1;
    if (juicy()) {
      p = clamp01(window.scrollY / entrance.offsetHeight);
      q = clamp01(1 - games.getBoundingClientRect().top / window.innerHeight);
    }
    html.style.setProperty('--p', p.toFixed(4));
    games.style.setProperty('--q', q.toFixed(4));
    window.dispatchEvent(new CustomEvent('scroll:progress', { detail: p }));
  }

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}
