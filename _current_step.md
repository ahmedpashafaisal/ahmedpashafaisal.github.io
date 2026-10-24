# Current step (temp)

8b (the ending): built 24 Oct, not committed. Waiting for Ahmed's look. As built: [PLAN-guide-bulb-cases.md](PLAN-guide-bulb-cases.md#8b-as-built-24-oct).

## Try it (desktop)
1. `npm run dev`, open `http://localhost:5173/?reset-achievements` once (clean start).
2. In the browser console, mark 15 pages as seen (all but Wildlings):
   `const s=JSON.parse(localStorage.getItem('apf-stats')||'{}');s.home=true;s.games=['ant-march-adventure','road-rush-puzzle','zen-merge-puzzle','sweet-shot','storm-alert','magic-mineral','the-unwanted','trapped','after-the-end','the-return','eat-the-rich','space-cricket','toony-car'];localStorage.setItem('apf-stats',JSON.stringify(s));const a=JSON.parse(localStorage.getItem('apf-ach')||'{}');a.about=Date.now();localStorage.setItem('apf-ach',JSON.stringify(a));`
3. Open `/games/wildling.html`: the ending.
4. After it: any bulb (rest, behind Next, 404, home) flies into the email button.
- Phone: just visit all 16 pages.
- Ahmed's own browser may already have all 16 pages: the ending plays on his next page.

## Drafts to rewrite
- Bulb line: "Okay. You got me."
- 24th achievement: "Eureka", "Saw every page and caught the idea."

## Also open
- 404 "No" button dark mode: fixed (uncommitted), 24/24.
- `lively` not pushed since G4.
- Dev-only, untracked: `site/red-test.html` + `site/red-test/`, `site/car-render-test.html`.
- Landing near miss unlocks "So Close": wired, not tested by real play.

## Tests
- `g8b.js` 56/56, `bug404.js` 24/24, `g8a.js` 30/30, `g5.js` 29/29 in `/private/tmp/claude-501/-Users-ahmedpashafaisal-Documents-Work-GameJob--DevPortfolio-ahmedpashafaisal-github-io/3977f7fb-9b44-4c47-b57d-59ad82fdbbd7/scratchpad/` (dev server on 5173; `NODE_PATH` = puppeteer-core in the `02ec03ea-…` scratchpad).
