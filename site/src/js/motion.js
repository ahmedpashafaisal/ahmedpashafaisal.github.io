// Shared motion helpers.
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const reducedMotion = () => query.matches;
export const onReducedMotionChange = (fn) => query.addEventListener('change', fn);

// True when juicy effects (squash, particles, shake, hit-stop) should play.
export const juicy = () => !query.matches;
