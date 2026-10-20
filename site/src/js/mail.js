// Email button, left of the theme toggle. Click copies the address and a
// "Copied!" bubble pops above the button with the address in it, so it
// still works for people with no mail app set up.
import { juicy } from './motion.js';
import { sfx } from './sound.js';
import { burst } from './burst.js';
import { act } from './achievements.js';

export const EMAIL = 'ahmedpashafaisal@gmail.com';
const TIP_MS = 2200;

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
  btn.setAttribute('aria-label', `Copy my email: ${EMAIL}`);
  btn.title = 'Copy my email';
  btn.innerHTML = `${ICON}<span class="mail-btn__tip" role="status"></span>`;
  document.body.appendChild(btn);

  const tip = btn.querySelector('.mail-btn__tip');
  let timer = 0;
  btn.addEventListener('click', async () => {
    sfx.press();
    const ok = await copyText(EMAIL);
    // Copy failed: the address is still shown, so it can be typed
    tip.innerHTML = ok ? `Copied! <b>${EMAIL}</b>` : `<b>${EMAIL}</b>`;
    btn.classList.add('is-tip');
    if (ok) act('contact');
    clearTimeout(timer);
    timer = setTimeout(() => btn.classList.remove('is-tip'), TIP_MS);
    if (juicy()) {
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 8);
    }
  });
}
