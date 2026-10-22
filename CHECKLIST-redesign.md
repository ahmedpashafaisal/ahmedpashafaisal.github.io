# Checklist: portfolio redesign
Read first in every session.
Rule: a finished step's Status is `✅ DONE`. Green check on every done row, never plain DONE.

## RESUME HERE (21 Oct 2026)
- **LIVE** at https://ahmedpashafaisal.github.io since 21 Oct (commit `4f92593` on `main`).
- Pages source = GitHub Actions (`deploy.yml`, runs on push to `main`).
- Push needs the `ahmedpashafaisal` GitHub account (active gh account is `pashanagorik`).
- Rollback: Pages source back to "branch main /", revert `4f92593`.
- Run: `npm run dev` → http://localhost:5173 · real build: `npm run build && npx vite preview`
  - `?reset` = first-visit entrance · `?preview` = hidden games · `?reset-achievements` · `?debug`
- Data: `site/src/data/games.json`. Game pages: `scripts/gen-pages.mjs`.
- Next: step 10 leftovers (images, link previews, Lighthouse); see Open items.
- **New plan (22 Oct):** runaway idea re-skin, branch `lively`. Read [CHECKLIST-runaway-idea.md](CHECKLIST-runaway-idea.md) first.
- Tampere deadline: **Thu 22 Oct 23:59 EEST** (`PHD Application/Tampere_3169/tracker.md`).

## Open items
| Item | Waiting on |
|---|---|
| Car improvements | Ahmed's list, next session |
| Featured subtitle | Ahmed: none or a line |
| Leaping images in `site/public/img/` | Ahmed: delete? |
| Copy rewrite: deck subtitle, blurbs | Ahmed |
| CV link on About | Ahmed: pick a CV PDF |
| Images ~13 MB total | Step 10: WebP/AVIF |
| Link-preview (OG) tags | Step 10 |
| EU logo on Storm Alert shot | Ahmed: OK to show? |
| three.js kept (car is 3D) | Step 10: check load speed |

## Taste rules learned (keep)
- Minimal + juicy; consistent layouts beat clever variable ones.
- Motion synced, no random angles.
- Never show the word "Legendary".
- No neon rainbow; no loud colour blocks.
- Palette: cream, ink, lime, white. No red. Exception (21 Oct): muted category tints on cards, tab dots, next/prev (`tokens.css` `--cat-*`).
- Featured = non-mobile only for now (Wildlings, Magic Mineral, Storm Alert).
- Buttons never drift toward the cursor (no magnet).
- Hard black shadows stay; lime glow look tried 22 Oct and rejected (weaker in light mode).
- No puzzle button. No JUICE switch.
- Nothing may block clicks or cover content (toasts click-through).
- Corner buttons stay at top; bar appears on scroll.
- Never use "The ones I'd show you first."
- Achievements: browsing ones plus the playful ones Ahmed picked.

## Steps
| # | Step | Status | Evidence | Approved |
|---|---|---|---|---|
| 1 | Scaffold | ✅ DONE | Branch `redesign`; `npm run build` OK (dist 1.4 kB); vite 8.3.4, three 0.186.1; not committed | 20 Oct |
| 2 | Look + feel test | ✅ DONE | Button, dot grid (push, glow, wake, pops, shockwave), card (float, juicy flip, satin sheen) felt by Ahmed; rainbow foil removed | 20 Oct |
| 3 | Game data | ✅ DONE | `games.json`: 14 entries, 6 tabs, 6 Legendary; old-site copy errors fixed. Moved on: videos → step 7; Storm Alert year + screenshots → before step 11 (Mattia OK received, per Ahmed 20 Oct) | 20 Oct |
| 4 | Card deck | ✅ DONE | Deck: 14 cards, 6 tabs, shuffle, flip, deal-in; tested 1280/640/390 px, 0 errors; tablet overflow fixed. Featured: Wildlings, Magic Mineral, Storm Alert (mobile games removed for now), gem separators, 211 px between banners. Storm Alert public. Magic Mineral GDD link removed. Approved by Ahmed ("not really juicy" → juice pass 4b) | 20 Oct |
| 4b | Juice pass: featured + deck | ✅ DONE | Built; real mouse test: banner slam + stagger + letter bounce (9 letter spans), landing shockwave, nearby cards lean, hover lift + neighbour nudge; 0 errors. Row slide synced (no rotation), float synced; approved by Ahmed. Magnetic CTA later removed (step 9) | 20 Oct |
| 5 | Landing + juice hero | ✅ DONE | Entrance, parallax, See-games anticipation, sound toggle; approved by Ahmed. 3D toys later replaced by car game (step 9) | 20 Oct |
| 6 | Detail pages | ✅ DONE | Bento dropped (Ahmed: inconsistent). Fixed-order layout on all pages; same section order, prev/next side by side (phone stacked), no "Legendary" text, no sideways scroll, 0 errors. Approved: "keep it like this" | 20 Oct |
| 7 | Media | ✅ DONE | Self-hosted clips: Zen 29.9→1.0 MB, Ant March 86→2.2 MB (`site/public/video/`); plays on click, 0 errors. Road Rush: no video (Ahmed: skip). Leaping Frog removed (13 games); App Store links removed (all BlockBuster iOS apps gone, checked 20 Oct) | 20 Oct |
| 8 | About page | ✅ DONE | `site/about.html`: avatar, role tags, bio, What I do, Experience, Education, Contact (copy, LinkedIn). Headless test 5 widths, 0 errors. No CV link yet | 20 Oct |
| 9 | Extras | 🔨 BUILT, NOT APPROVED | See [STEP9-extras.md](STEP9-extras.md). Car game landing, achievements (22), dark mode, dot transition, bottom bar, section snap, scroll car, game cursor, 404. All headless tested, 0 errors | |
| 10 | Polish | 🔨 PARTLY | 14 old-URL redirects live and tested; 404 page live (status 404). Open: images, OG tags, Lighthouse | |
| 11 | Go live | ✅ DONE | Merged + pushed `4f92593`, Pages → Actions, live check: home, 13 cards, About, game pages, redirects, 404, 0 errors | 21 Oct |
