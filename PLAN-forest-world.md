# Plan: forest world (proof of concept)
22 Oct 2026. **Nothing here is decided.** Only lines marked "Ahmed said" are his words.

## Read order for a new session
1. This file.
2. [CHECKLIST-runaway-idea.md](CHECKLIST-runaway-idea.md): RESUME block, step table.
3. [PLAYBOOK-runaway-idea.md](PLAYBOOK-runaway-idea.md): decisions so far, story.
4. Picture: [refs/forest-idea-gemini-22oct.png](refs/forest-idea-gemini-22oct.png).

## Where things stand
| What | State |
|---|---|
| Steps 1–5c | Done, commit `a92ae9c` on branch `lively`, pushed |
| Live site | Untouched (deploy runs from `main` only) |
| Step 6a map test | Built (2D and 3D board maps). Ahmed: "both are ugly" |
| Forest step 1: style test | Done 22 Oct: Ahmed picked cel shaded try 2. Test page `site/forest-style-test.html`; prompts and raw images in `refs/forest-style/`. Checklist row F1 |
| Forest step 2: forest drawn by code | Built 22 Oct; round 2 (name fit, button colours) 23 Oct. Test page `site/forest-test.html`. Checklist row F2 |
| Forest step 3: the fox | 3a design done (1b picked). 3b fox in code built 23 Oct, waiting for Ahmed's feel check, on `site/forest-test.html`. Checklist rows F3a, F3b |
| Not committed | Checklist and playbook edits, `hero3d.js` exports, `site/map-test.html` + `site/map-test/`, `refs/`, this file |

## The idea
- The whole site becomes a forest, seen from above.
- Every page is forest (Ahmed said).
- Each section sits in its own clearing (Ahmed said).
- Text sits on lighter or brown ground; empty space is forest.
- The forest stays quiet. Pines react to the mouse.
- Day: bright, birds flying here and there.
- Night: campfires and similar.
- The games deck becomes a map in the same world: cabins in the woods, lakes, islands. The 3D car drives there.
- Why: Ahmed is "a nature person who likes to hike and make games".

## The picture
- Gemini image, made by Ahmed to show the idea, not the target.
- Right: the camera view only (Ahmed said).
- Change: trees a bit more top-down, and denser (Ahmed said).
- Style and colours: still open.

## Ahmed's answers so far
| Topic | Ahmed said |
|---|---|
| Map | Top-down 2D, organic; islands or a settlement in nature with lakes |
| Dynamic | A few island types by category, repeated down the page |
| Places | A generic type, like a cabin in the woods |
| Island growth | Not sure how |
| Art | Kie generation; Ahmed picks the style |
| Style leaning | Clean, minimal, cel shaded, flat illustration |
| Site match | One art style for the whole site |
| Lime | Not required: "the idea is more important" |
| Water | Shallow water crossing, cheap splash |
| Driving | Click a place, the car drives there; scroll stays normal |
| Kie budget | Up to $5–10 |
| Styles to test (step 1) | Keep all 3: flat, cel shaded with black outline, inked storybook |
| Colours | Deep green and light brown, with other elements; Claude's colour judgement |
| What stays (fonts, buttons, cream) | Concept first; fonts decided later |
| Style pick (22 Oct) | Cel shaded with outline, try 2 (`refs/forest-style/raw/b-day-2.png`). Changes: middle clearing much bigger; campfire position not right |
| Clearing size | His screenshot outline: about 72% of the window width, 86% of its height; "needs to be dynamic and responsive" |
| Campfire | "Centered, not left" |
| Trees | Asked: generate a few trees, duplicate them in code like the dots; easier mouse-over |
| Feedback on step 2 (23 Oct) | "Looks good except": name must be responsive and inside the clearing; palette off, maybe drop lime from the button; the name could be a prop of its own |
| Name prop | "Something wooden" |
| Character | Replaces the car: "The visitor is the character in form of a cute creature/animal" |
| How it hunts ideas | "Running, like a cat looks for a ball" |
| Moving it | "Click where to walk and it follows the mouse" |
| The idea symbol | "Lightbulb can stay if we can't find any better fitting way to forest to communicate idea" |
| Button colour (23 Oct) | Amber for now; amber and wood both look good; final pick later, depends on the rest of the site |
| Order | Character first, then the wooden name sign |
| Moving the character | "Click where to walk to" (no mouse following) |
| Which animal | "A fox maybe, but needs to be simple and minimalistic. Needs all kinds of range of animations" |
| Keeping the fox simple | Bean fox: no real legs; hops, squash, spring tail, bulb eyes reused; 8 motions first |
| Fox in code (23 Oct) | Rejected: "it doesn't look like the reference at all"; "the code generated animation is not working at all, the cute vibe is gone". Leaning: "I feel like I need to make this in 3d and use a 3d model instead. 2d would also work" |
| Fox look (23 Oct) | Option 1b "Upright": round head on a small body, stands on two feet (`site/fox-test/1b-*.webp`). Half a tree tall for now |
| AI look | Proof of concept only; the result must not look AI generated. Hand painting or code-drawn art is fine once the look is locked |

## Open questions
1. Art style and colour palette.
2. Phone map: tall map, tap a cabin, car drives, page follows only while driving, card slides up. Not answered yet.
3. How an island grows. Options: growing blob, chain of islets, size templates. Claude's pick: growing blob.
4. Pines on hover: how much movement?
5. Birds and campfire details.
6. What stays from today's site: fonts, hard shadows, buttons, cream?

## Decided items this would change (confirm first)
| Playbook line | Change |
|---|---|
| Keep: cream + dot grid | Forest instead |
| Look of buttons, labels, frames: kept | Maybe new colours |
| Fonts: keep Bricolage and Figtree | Open |

## Risks seen so far
- Clearings must scroll with the content. Draw the forest per page, render only the visible part.
- Readability on text-heavy pages (game pages, About).
- Weight: first screen must stay under 500 KB. Forest canvas must sleep when still.
- The page transition and landing shockwaves use the dot grid. Both need forest versions.
- AI art can drift in style. Generate in batches from one style reference.
- Scope: this is a site-wide redesign, not just step 6.

## Possible next steps (proposals only)
| # | Step | Why first |
|---|---|---|
| 1 | Style test with Kie: one forest and clearing patch in 2–3 styles | Style decides everything else |
| 2 | Forest background test page: chosen style, clearings, scroll, hover, day and night | Proves readability and weight |
| 3 | Map in the world: cabins, lakes, islands, car, fords | Builds on 1 and 2 |
| 4 | Re-plan steps 6+ in the playbook | After the look is chosen |

## Parked ideas
- Graveyard of unfinished ideas.
- Deck bulb beat: empty plot, "Nope, not a game yet."
- Silly water crossings: snorkel, pop-up sail, beaver bridge.
- Step 6c featured banner beats: still planned.

## Lessons for the next session
- Describe the picture back before building any look (6a was built from the word "map").
- Fresh randomness matters; no repeats.
- A reference shows the idea or a quality bar, not something to copy.
- Copy rules: sentence case, UK spelling, no shorthand, no em dashes.
