# Bundle 22 — Whole-card selection, disabled category cards, winner points and stronger sounds

Import `FigmaMake-Changes-Only.zip` into the **existing** Figma Make Baleshhaa source, replacing these **five** files in `src/`:
- `src/App.tsx` — Full category card surface is the selection target. The old "اختيار التصنيف" button and bottom label are completely removed. Selected cards stay clickable so users can change their selection.
- `src/index.css` — When the selected count reaches 4/6/8, unselected cards become grey, desaturated, image muted and non-actionable, while selected cards remain active. Hover/focus and accessible info icon are supported.
- `src/LiveMatch.tsx` — Winner's name and score appear **next to each other**, within the existing winner-only result card. Draw logic unchanged.
- `src/live-match.css` — Responsive inline winner-and-points layout.
- `src/sfx.ts` — New layered, original WebAudio "trap bomb" (crack, deep bass explosion, rumbles and small echoes) and dramatic "pit trouble" (descending fall, impact and warning tones). Compressor limits peak volume. No external audio assets needed.

## Verified
- TypeScript strict check: passed.
- Full isolated browser build: passed.
- Playwright Chromium with authenticated mock API: selecting 4, 6, or 8 **using the entire card**, all other cards grey/disabled at capacity, clicking a disabled card does nothing, deselecting re-enables the rest, keyboard Enter toggles the target, info popover remains accessible on active/selected cards. All passed, browser errors = 0.
- The same browser runs through teams, question, answer, scoring, finish and winner-only celebration, verifying score **beside** winner via bounding-box alignment.
- Mobile 390px: 1-column board, no horizontal overflow and neutral draw result passed.
- WebAudio mock: pit uses 7 sound sources/2 filters/1 compressor; trap uses 7 sound sources/5 filters/1 compressor. Original win/question/reveal/score cues remain functional.
- No Neon data or backend changes, no changes to original GitHub source.

## Production acceptance
This ZIP is **not yet imported into the live Figma Make application**. Browser tests use simulated match responses to avoid consuming real question stock. A live user should import the ZIP, preview and test the flow, and **listen to the sound effects on their own device** before calling production audio fully verified.

The original 14 category photographic WebP files and dynamic Neon question media from Bundle 21 are preserved.
