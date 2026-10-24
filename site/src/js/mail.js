// Email button, left of the theme toggle. Click opens the "Got an idea?
// Reach out!" card (js/idea.js): the mail app, Gmail, Outlook, or copy the
// address, which the card also shows, so it works with no mail app set up.
// Caught bulbs fly into it (step 8b).
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { burst } from './burst.js';
import { openCard } from './idea.js';

export const EMAIL = 'ahmedpashafaisal@gmail.com';

const ICON = `
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
  <path d="M4 7.5l8 6 8-6" />
</svg>`;

// Clipboard API first; older execCommand route when the browser refuses
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

export function initMail() {
  const btn = document.createElement('button');
  btn.className = 'mail-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Email me');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.title = 'Email me';
  btn.innerHTML = ICON;
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    sfx.press();
    const r = btn.getBoundingClientRect();
    if (juicy()) burst(r.left + r.width / 2, r.top + r.height / 2, 8);
    openCard('reach', { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
}
