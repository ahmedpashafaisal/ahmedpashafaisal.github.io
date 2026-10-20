// Speaker toggle. Its click is the browser permission that unlocks audio.
import { setSound, sfx, soundOn } from './sound.js';
import { act } from './achievements.js';

export function initSoundToggle(btn) {
  const render = () => {
    const on = soundOn();
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Sound on' : 'Sound off';
  };
  btn.addEventListener('click', () => {
    setSound(!soundOn());
    if (soundOn()) act('sound');
    render();
    sfx.ding();
  });
  render();
}
