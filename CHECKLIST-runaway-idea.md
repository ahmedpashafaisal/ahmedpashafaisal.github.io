# Checklist: runaway idea
Read first in every session. Plan: [PLAYBOOK-runaway-idea.md](PLAYBOOK-runaway-idea.md).
Rule: a finished step's Status is `✅ DONE`. Green check on every done row, never plain DONE.

## RESUME HERE (22 Oct 2026, end of session)
- Branch `lively` (from `main`), committed `3b49718` and pushed to `origin/lively` (22 Oct). Live site untouched: deploy runs only on `main`. Ask Ahmed before each commit.
- Done: 1–5c. Bulb twin + 20 motions + runaway eyes (`src/js/bulb.js`, `src/styles/bulb.css`); landing joke in `src/js/hero3d.js`; resting in `src/js/rest.js` + `src/styles/rest.css`.
- 5a "Glass" look was built and reverted: black shadows stay (see `CHECKLIST-redesign.md` taste rules).
- Landing now: one round of 6 (4 or 2 on short screens), last bulb left wakes up and dodges, car lines "What the…!" / "Hold still!" / "Seriously?!" / "Hey! Come back!", comes back after 6 s ("There you are!"). Lines are drafts Ahmed may rewrite.
- Dev-only test pages (not built, not deployed): `bulb-test.html` + `bulb-test/`, `kit-test.html`. Delete at step 9.
- Run: `npm run dev` → http://localhost:5173 (`?reset` = first visit, `?debug` = `window.__landing`).
- Step 5c approved 22 Oct, **not committed yet** (last commit `3b49718` = 1–5b). Skip dropped (Ahmed: nothing blocks).
- Phone test: `npm run dev -- --host` → open the Network URL on the phone (same Wi-Fi).
- **Next: step 6** (Wave 2: Featured + deck). Gate it first: say what it creates, wait for Ahmed's go.

| # | Step | Status | Evidence | Approved |
|---|---|---|---|---|
| 1 | Save docs | ✅ DONE | Playbook + checklist saved; pointer in `CHECKLIST-redesign.md`; branch `lively` created; steps revised after bulb change | 22 Oct |
| 2 | Lock story | ✅ DONE | "The one that got away": beats, voices, rest when you rest, return visits; shared game-page beat; hint "Catch me." | 22 Oct |
| 3 | Bulb twin + match check | ✅ DONE | Built: `src/js/bulb.js`, `src/styles/bulb.css`, dev-only `bulb-test.html` + `bulb-test/` refs. 9 motions (incl. pop in); headless 1440 + 390 px, light + dark, real clicks, 0 errors, 4.0 KB gzip. Match + feel approved; Ahmed wants more motions | 22 Oct |
| 3b | More motions + eyes | ✅ DONE | 20 motions; runaway eyes beside filament (open, wink, squint, sleep, wide, sad, spiral, look, blink); Z's; 4 pairs split. Real clicks, eye timeline checked per frame, reduced motion shows final eyes, 0 errors, 7.7 KB gzip. Approved | 22 Oct |
| 4 | Kit test | ✅ DONE | Dev-only `kit-test.html`: Glass, Thread, Filament sets (button, chips, card, banner, bubbles, bulb) + heading font row (Bricolage today, Bagel Fat One, Bowlby One, Dela Gothic One, Gluten). Real mouse hover/press, light + dark, 1440 + 390 px, 0 errors. Picked "Glass"; fonts kept | 22 Oct |
| 5a | Wave 1a: Glass look everywhere | ✅ DONE (reverted) | All 38 hard black shadows in 10 style files → Glass glow tokens (`tokens.css`, dark set in `theme.css`); lime two-tone main buttons; plain two-tone round buttons and chips; frames 24 px, tiles 22 px. Home, game page, About, 404 at 1440 + 390, light + dark, real mouse hover/press, 0 errors. Ahmed: old look better in light mode; 10 files restored with git, 38 black shadows back | 22 Oct |
| 5b | Wave 1b: Landing joke | ✅ DONE | 2nd rework (22 Oct): one round, no new rounds, no "Brainstorm!" text; "Drive me to an idea" only until first catch; car lines per dodge ("What the…!", "Hold still!", "Seriously?!", "Hey! Come back!"); runaway comes back after 6 s ("There you are!"); "Brainstorm" achievement at the 5th catch ("Caught every idea but one."). Real clicks, scroll away and back, 0 errors. Approved ("looks good") | 22 Oct |
| 5c | Wave 1c: Resting | ✅ DONE | Skip dropped 22 Oct (nothing blocks). New `src/js/rest.js`, `src/styles/rest.css`; 1 import + 1 init in 4 page entries; creep + "So close!" in `hero3d.js`. Landing: 5 real catches, rest → runaway crept 430 → 110 px in 12 s, reach → "So close!", not counted as a dodge. Other pages: margin strip at 1440, peek at 390 + 640, near miss, scroll and busy leave, cooldown, sleep, dark, reduced motion. 33/34 checks pass; 640 px peek touches the last thumbnail's edge. 0 errors. +2.8–3.0 KB gzip per page; bulb 5.1 KB loads on first rest. Round 2 (22 Oct, Ahmed's phone test): bug fixed, short screens (4 or 2 bulbs) had no runaway; now any count, real taps at 390×664, 375×560, 1366×600, 1440×900 (12/12). Resting now random: spot, side, entrance; no repeats per visit; max 4 hops. 6 rests each on desktop and 390×664 phone: no repeats, all entrances seen; phone stayed on the right side on these pages (free rows only beside short headings). Regression 26/26 + 8/8. Round 3: "So close!" waits until the bulb is gone (other pages; landing unchanged), tested desktop + phone. Approved (Ahmed tested on his phone) | 22 Oct |
| 6 | Wave 2: Featured + deck | TODO | | |
| 7 | Wave 3: Game pages | TODO | | |
| 8 | Wave 4: About, footer, 404 | TODO | | |
| 9 | Final check | TODO | | |
