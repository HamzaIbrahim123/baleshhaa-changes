# Bundle 20 — Finish the ORIGINAL Seen Jeem UX with real Neon gameplay

## Figma Make installation
Import **`FigmaMake-Changes-Only.zip`** into the existing Baleshhaa Figma Make source tree and replace these **four files only**:
- `src/App.tsx`
- `src/LiveMatch.tsx`
- `src/index.css`
- `src/data.ts`

The ZIP root is `src/` (not `Bundle-20/`). This repository contains the changes separately and **does not modify the original Baleshhaa GitHub source**.

## Delivered experience
- Home page: normal Games explorer, no invitation to the 'real question demo.'
- Seen Jeem / **استكشف اللعبة**: **ابدأ اللعبة** / **كيف تلعب؟** instead of demo and 4/6/8 preview shortcuts.
- Same ORIGINAL details, category grid and category/team setup styling maintained.
- **ابدأ اللعبة** opens the original category selection screen, with 4/6/8 choices; no account needed to browse.
- Real categories, cover images, descriptions, ready status and personal inventory are obtained via Neon catalogue and progress API.
- Original category cards now support selecting via cover image or a small **اختيار التصنيف** button; selected cards show a clear check mark.
- Only categories with >=2 published questions at each 200/400/600 level are eligible, and empty per-player balances can't be selected.
- After selecting the requested 4/6/8: original team & 3-out-of-5 helper selection screen.
- At "ابدأ المباراة", player authentication is required; new match created on the backend via `gameApi.create`.
- Real authenticated match goes directly to the **already approved compact board** through `LiveMatch initialMatch`: no duplicate category setup stage.
- Every question is served by Neon, with dynamic images, answer/reveal, scores and helper behaviors intact.
- If an old active match exists, explicit confirmation to abandon it first; unshown questions remain available.
- Finishing and "العب مرة ثانية" routes back to the original category selection, rather than another demo flow.
- Removes unused demo categories and fake sample questions from `data.ts`; preserves real game list and helper definitions.

## Verification performed
- **All 14 active categories in Neon have enough questions** to support a new game as of 2026-11-18 (personal inventory may differ).
- Full TypeScript check executed on changed TSX/TS files plus imported application modules with TypeScript 5.7.3 and React 19 types: **EXIT 0**.
- JSX parser diagnostics: no syntax errors.
- Archive is 4 files only; ZIP local headers and CRC32 verified.
- Real backend match-create response verified by reading deployed game function: returns id, category_ids, team_names, team_helps, test_mode, created_at.

## Remaining verification
- A browser end-to-end game run with the imported changes has **not yet been performed** in Figma Make. Run a new match after import and test category picks, helpers, opening/revealing questions, and finishing.
- No production frontend deployment or original-repo modification is claimed.
- Backend/database not changed in this bundle. Existing 1260 published questions and photo assets remain untouched.
