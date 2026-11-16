# Baleshhaa — Bundle 01 (Figma Make UI build)

This is **one changes-only bundle** built from the approved [Figma Desktop UI designs](https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=127-140), **compared with** the clean [Baleshhaa Figma Make starter repo](https://github.com/HamzaIbrahim123/Baleshhaa).

## How to apply in Figma Make

**Copy only the following files into the Figma Make project ROOT, using the exact paths below (overwrite the 2 changed files):**

| Status | Exact target path | What it does |
| --- | --- | --- |
| MODIFIED | `src/App.tsx` | Interactive Arabic RTL desktop-first React UI: Home, login/register UI preview, Seen Jeem details, category selection, team + help setup, 4/6/8 boards, question/reveal/scoring, winner-only/tie result, confirmation modals |
| MODIFIED | `src/index.css` | Responsive styling, Figma colors, typography, cards, light theme, trophy/confetti CSS motion, mobile support |
| NEW | `src/data.ts` | Illustrative game categories, helpers, rules labels and **explicitly unverified** sample question |
| NEW | `public/art/seen-jeem.webp` | Seen Jeem game-card artwork matching the approved design |
| NEW | `public/art/letters.webp` | لعب الحروف artwork matching the approved design |
| NEW | `public/art/codenames.webp` | كود نيمز artwork matching the approved design |
| NEW | `public/art/thirty.webp` | تحدي الثلاثين artwork matching the approved design |

`bundle-manifest.json` records the baseline GitHub blob hashes and SHA-256 for every changed file; this README and manifest are guidance and do **not** need to be copied into `src/`.

## Important limitations

- This is **UI/UX build stage**. The source repository currently has a blank Vite/React screen; this bundle adds the approved user-facing UI and functional on-page navigation.
- The registration form is labeled **preview only**: it permits a local UI preview, **does not save usernames/passwords** and **does not create real accounts**. No backend, Neon database, or API endpoints are deployed or touched.
- Category labels and a sample World Cup question are **design placeholders**, not a verified question bank. Game data is not shared between devices and is reset after refresh.
- The trophy/confetti winner state animates using CSS with reduced-motion support. Real game scoring and rule enforcement will require later server-side implementation; this code is a functional visual demonstration, not production gameplay.
- Leave `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `.figma/` and all other original files unchanged. The bundle uses only `react`, `react-dom`, and browser features already available in the baseline.

## Test in Make

1. Open the new Figma Make project attached to the `Baleshhaa` starter and copy the seven files into the exact paths above.
2. Use Make's Preview (Vite should already run). Navigate Home → سين جيم → تسجيل تجريبي → 4/6/8 categories → teams + 3 helps → board → question → reveal → scoring → winner/tie.
3. If the preview fails, inspect browser console and Make's Vite errors. No application-source changes are required in the original `Baleshhaa` repository until explicitly requested.

No changes were pushed to the original `Baleshhaa` repository.
