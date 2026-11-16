# Bundle-07 — Live Neon catalogue and information popovers

### Already uploaded (no user action needed)
- **3 Sections:** كرة القدم (7), إسلامي (4), دول (3)
- **14 categories**, each with a description and **original illustrative SVG artwork** stored in the live Neon database.
- Sections are headings only and have no images. Images are original visual interpretations, not official football club logos.
- Existing accounts and games remain unchanged. **Questions: 0.** Categories are visible, but real play remains unavailable until questions are approved.

### Import exactly these changed files into Figma Make

Download `FigmaMake-Changes-Only.zip` from this bundle and extract the two files into their original paths (not inside the Bundle-07 folder):

- `src/App.tsx`: reads the 3 sections and 14 categories through the existing `apiCatalog.list('seen-jeem')` endpoint. Uses Neon images and displays an accessible `i` button with the short description on each card.
- `src/index.css`: layout, responsive images and description popovers.

The old sample categories remain accessible only through the clearly labeled **عرض معاينة تجريبية** option, for UI testing. There are no fake games-remaining counts shown for the new catalogue.

### Archive for reference
- `artwork/` contains all 14 original SVG images already stored in Neon.
- `seed/catalog-seed.sql` is the restoration script, **not** required for Figma Make.
- `bundle-manifest.json` records the files and database state.

### Validation
Neon: 3 sections, 14 categories, 14 images, zero missing images, 0 questions, 2 previous accounts preserved. GitHub frontend source changes were checked against the current `Baleshhaa` baseline. Figma Make runtime and direct API HTTP access were **not independently tested** in this environment.

Original `Baleshhaa` GitHub repository is unchanged.
