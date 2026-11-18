# Bundle 17 — Live board category images (CSS-only hotfix)

After Bundle 16 the game board had the correct 4 / 6 / 8 compact layouts but its category images were invisible.

## Root cause
The category photos are loaded from `src/category-photos.css` as local `/art/categories/*.webp` background images, while their underlying Neon `<img>` elements are intentionally set to `opacity:0` when a local category artwork is available.

Bundle 16 introduced a higher-specificity `background:inherit` shorthand on `.live-board-picture .catalogue-cover.live-category-image`. This inadvertently **reset `background-image` to none** while the `<img>` remained invisible.

## Fix applied
In `src/live-match.css` the conflicting `background:inherit` shorthand is replaced by `background-color:transparent`, which does **not** reset `background-image`.

All category artworks are unchanged (Barcelona, Real Madrid, World Cup 2026, Quran, Seerah, Prophets, etc.). Their existing assets, title labels, game counts, button behavior, question levels and the 4/6/8 layout are preserved.

## Figma Make import
Extract `FigmaMake-Changes-Only.zip` into the existing Figma Make project root, replacing **only `src/live-match.css`**.
No need to reimport `LiveMatch.tsx` or any question-bank files. No Neon or backend changes.

## Validation
- Verified the exact CSS collision with `category-photos.css`.
- Confirmed category WebP files exist in the original repo under `public/art/categories`.
- Verified all 8 displayed/relevant category names have image background mappings.
- Verified ZIP structure and CRC-32.
- Browser preview after user import is still required to confirm rendering in Figma Make.
