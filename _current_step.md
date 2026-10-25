# Current step (temp)

Step 9 final check: fixes 1–4 committed 25 Oct (`37ada1f` + the WebP commit). Waiting for Ahmed's look, then 9 is done.

## Before → after (production build, cold load)
| Page | Load | Lighthouse phone perf | Desktop perf |
|---|---|---|---|
| Home | 498 → 364 KB | 86 → 96 | 100 |
| Wildlings page | 1423 → 480 KB | 61 → 89 | 71 → 99 |
| Space Cricket page | 419 KB (phone) | 88 | 99 |
| About | 257 KB | 93 | 99 |
| 404 | 148 KB | 100 | 100 |
- Budget 500 KB first screen: all pages under. Layout shift 0.83 → 0.01.

## Open
- Drafts to rewrite: bulb line "Okay. You got me."; achievement "Eureka", "Saw every page and caught the idea."
- `lively` not pushed since G4 (`44fc6cd`).
- Dev-only, untracked: `site/red-test.html` + `site/red-test/`, `site/car-render-test.html`.
- Landing near miss unlocks "So Close": wired, not tested by real play.
- Unused screenshots `site/public/img/shots/leaping-liliy/*.jpg` (game not in `games.json`): keep or delete?
