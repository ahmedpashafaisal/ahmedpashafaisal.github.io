# Current step (temp)

G2 + G3 committed, feel check pending. Ahmed resumes in a fresh session.

## Open
- Feel check of G2 + G3 on http://localhost:5173 (`npm run dev`); then mark both ✅ DONE.
- Final build tests all green (G3 60/60 × 3, g2 25/25 × 3, g1, S3a, S1 × 2). Logs `h*-*.log` in `/private/tmp/claude-501/-Users-ahmedpashafaisal-Documents-Work-GameJob--DevPortfolio-ahmedpashafaisal-github-io/2e38467f-de2a-4772-92cf-19827cecdf2b/scratchpad/` (may be gone).
- `refs/` (87 MB Kie images) not committed: Ahmed decides (git or local).
- Push `lively`: not asked.

## State
- G1 `3404b0c`, G2 `8dd6a94`, G3 committed 23 Oct. Nothing pushed since `a92ae9c`.

## Tests
- Suites `g1.mjs`, `g2.mjs`, `g3.mjs`, `s3a-g1.mjs`, `s1.mjs` live in the old session scratchpad (path above); copy them over.
- `NOGL=1` = no WebGL; `BASE=http://127.0.0.1:4173` = frozen build served by `vite preview --config <scratchpad>/preview.config.mjs --outDir <scratchpad>/build-g3`.
- Test hooks (`?debug`): `__landing.guideTo(el)`, `__landing.backPlace()`.
