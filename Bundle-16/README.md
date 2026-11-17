# Bundle 16 — Baleshhaa Seen Jeem: compact real-game board

## Figma Make upload
Import `FigmaMake-Changes-Only.zip` into your **existing** Figma Make project. Replace just:
- `src/LiveMatch.tsx`
- `src/live-match.css`

Do **not** import `qa-neon-fixes.md` or this README into Figma Make. All 8 verified question changes have already been applied directly to Neon. No Figma Design canvas changes were made.

## Layout follows the actual approved Figma reference (not generic cards)
- [4 categories — frame 175:263](https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=175-263) → 4 columns × 1 row
- [6 categories — frame 175:412](https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=175-412) → 3 columns × 2 rows
- [8 categories — frame 175:608](https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=175-608) → 4 columns × 2 rows
- For each category: an image in the **center**, 200/400/600 **vertically** on the right and on the left (six independently clickable cells).
- Smaller score/helper cards and compact board header, turn pill and actions.
- Real Neon category images, question/open/reveal, score, selected helpers, personal remaining-games count and winning animations remain integrated.
- Responsive: fewer columns on narrower screens; a single column on phones.
- Only the board-stage layout changed; question/reveal/result business logic stays the same.

## Checks performed
- Verified code against screenshots, layer names and measured Figma card sizes for all 4/6/8 variants.
- Verified the edited JSX board contains balanced opening/closing element counts.
- Verified all pre-existing match logic before the board remains byte-for-byte unchanged.
- ZIP headers and CRC32 for each of the two embedded source files passed.
- Neon confirmed 990 published questions, 990 distinct normalized question texts, and valid score levels.
- **Final browser/TypeScript build check is still required after importing this ZIP into Figma Make.** No claim of deployed or runtime-tested UI is made.

## Question-bank QA note
This patch fixes the **eight known problematic questions**, not a new independent historical/Islamic fact-check of all 990 answers. Consult qa-neon-fixes.md. The complete question-by-question fact audit remains a separate task.
