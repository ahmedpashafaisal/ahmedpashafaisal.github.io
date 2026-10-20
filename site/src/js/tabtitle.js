// Tab title tricks: leave the tab and it calls you back; return and it
// says hi for 2 s, then the real title comes back.
const AWAY = 'Come back!';
const BACK = "You're back!";
const BACK_MS = 2000;

export function initTabTitle() {
  const real = document.title;
  let timer = 0;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (document.hidden) {
      document.title = AWAY;
    } else {
      document.title = BACK;
      timer = setTimeout(() => (document.title = real), BACK_MS);
    }
  });
}
