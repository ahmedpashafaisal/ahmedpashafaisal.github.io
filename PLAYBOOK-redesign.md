# Playbook: portfolio redesign

## Goal
A simple, minimal portfolio where every element has juice, so the visitor feels "this person makes games" without being told.

## Decisions (interview, 20 Oct 2026)
| Area | Decision |
|---|---|
| Timing | Full redesign before Tampere (22 Oct). Site first, then application |
| Audience | Studios first, PhD panels second |
| Identity | Creative game designer: juice in every small thing |
| Rule | Show, never say "I'm creative" |
| Wording | Never show the word "Legendary"; rarity is styling only |
| Feel | Minimal and special. No narrative frame, nothing fancy |
| Look | Clean base + juicy motion |
| Colour | Light, warm off-white |
| Background | Reactive dot grid: ripples from cursor/clicks, then settles |
| 3D | One three.js moment (hero), rest 2D |
| Stack | Vite + GitHub Actions deploy |
| Hero | Juice playground: abstract shapes at the edges that morph into game props |
| See games button | Anticipation: crouch, hold, launch scroll. Manual scroll = calm parallax |
| Landing | One-press entry: name + role visible, one juicy button bursts the site alive |
| First screen | Full-screen entrance: name, one fun line about what I do (joke OK), entry button. Fun elements at the edges. No cards |
| Games | Trading-card deck, rarity tiers, games only (12) |
| Legendary cards | Best 5–6, each with a case study |
| Featured | Stacked full-width banners (~70vh), Legendary only, alternating sides, screenshot pan, "Case study →"; then full deck (all games) |
| Common cards | Card back only, links out |
| Game page | "See more" detail page for every game, built from data; sections without content (video, screenshots…) are skipped |
| Pages | Home (entrance + featured + deck), case studies, About |
| Extras | Achievements, XP bar, easter eggs, juicy cursor + buttons |
| Extras limit | XP bar = 2 px line; achievements = 1 small toast at a time, corner, never over content |
| Copy | Claude drafts, Ahmed rewrites in his voice |
| Media | Mixed sources; per-game table |
| Sound | Off by default; speaker toggle bottom-left; its click unlocks audio (no autoplay bypass exists); remembered |

## Defaults I picked (not asked)
| Default | Why |
|---|---|
| One motion language: shared timings + easing tokens | Juice everywhere without noise |
| Copy tone: short, warm, light play; no forced jokes | Matches "minimal and special" |
| Branch `redesign`; old site live until merge | Zero downtime |
| New site lives in `site/`; old files untouched until step 10 | Easy rollback |
| Old URLs (`/sweet-shot.html` etc.) keep working | Store pages and CVs link to them |
| Card shape 5:7 (63×88 mm standard) | Reads as "card" at once |
| Card layout: name bar, art window ~45%, stats box, rarity mark | Standard card traits |
| Hit-stop 50–80 ms = 3–5 frames at 60 fps | Visible, not laggy |
| Screen shake 150–250 ms, small amplitude | Felt, not nauseating |
| Dot grid: 2D canvas, faint, pauses when tab hidden | Cheap on battery |
| `prefers-reduced-motion` = juice off, no shake, still grid | Accessibility |
| Touch: tap to smash; weak phones get 2D fallback | Phones are half of visitors |
| Clips: muted loop MP4/WebM, < 2 MB, lazy-loaded | Speed |
| Fonts: Google Fonts, 2 families max | Speed |
| Bootstrap + jQuery removed | Dead weight |
| Achievements saved in localStorage | No backend needed |
| Lighthouse: Performance ≥ 85, Accessibility ≥ 95 | Slow wifi, screen readers |
| Before the press: name + role visible, button under them | Passes the 5-second test |
| Button label: one word ("Press"); final in copy rewrite | Minimal |
| Other ways in: scroll, Enter/Space, tap anywhere | No one gets stuck |
| Return visits skip the entry | Gate only once |
| Reduced motion: entry stays, burst without shake/hit-stop | Accessibility |
| Entry burst ≤ 600 ms, then fully usable | A moment, not an intro |
| Optional soft "pop" sound on dot pops (only when sound is on) | ASMR feel without autoplay noise |
| Edge props: frog, coin, candy, car, gem, stone | Game hints; coin = universal pickup |
| Props built in code from simple shapes, low-poly | No downloads, no modelling, tiny size |
| Abstract shapes: cube, sphere, torus, cone, capsule, octahedron | Six distinct silhouettes |
| "Morph" = juicy swap: shape squashes out, prop springs in | True vertex morph needs custom models |
| Shapes only at the edges, never over name/line/button | Centre stays clean |
| Phones: tap = morph; 3–4 shapes | Small screens |
| Prop morphs back 1.5 s after pointer leaves | Calm at rest |
| Reduced motion: shapes move flat (no squash, particles, shake) | Accessibility |
| Sounds synthesised with Web Audio, no files; max ~0.3 volume | ~0 kB, quiet |

## Steps
| # | Step | Creates / changes / spends |
|---|---|---|
| 1 | Scaffold | Docs saved, branch `redesign`, Vite project, Actions workflow (not live) |
| 2 | Look + feel test | 1 card + 1 button on off-white dot grid, with motion tokens. Checks the main cue: does a press *feel* like something |
| 3 | Game data | `games.json` (12); rarity proposal; media table for you |
| 4 | Card deck | Flip, filter, shuffle, rarity on Home |
| 5 | Landing + juice hero | Entry press, three.js shapes, name + fun line, parallax, See-games anticipation, sound toggle; mobile + reduced-motion fallback |
| 6 | Detail pages | Generated page per game, fixed order: hero (description + links + facts, screenshot slider) → my role → what I did (flip) → video → prev/next row; empty sections skipped |
| 7 | Media | Clips cut/compressed (ffmpeg) from your sources |
| 8 | About page | Bio, MSc, CV link, contact |
| 9 | Extras | Achievements, XP bar, easter eggs, cursor, puzzle button (pieces snap together; never a gate), Press button more fun |
| 10 | Polish | Redirects, meta/OG tags, Lighthouse, a11y, phone check |
| 11 | Go live | Merge to `main`, switch Pages source to Actions (outward-facing: confirm first) |

Order note: step 5 runs before steps 3–4 (landing needs no game data).

## Time
- Claude build: ~10–14 h.
- Your input: ~3–5 h (approvals, media pointers, copy rewrite).
