# Bundle-04 — Seen Jeem scoring and answer selection fixes

**Baseline:** latest source in `HamzaIbrahim123/Baleshhaa` at blobs listed in `bundle-manifest.json`.

## Apply to Figma Make
Download **FigmaMake-Changes-Only.zip** from this folder and copy its contents into the **root** of the existing Figma Make project, replacing only the following:

- `src/App.tsx` — fixes no default winner selection, trap-only target scoring (+question points on correct; −question points on wrong), consistent help SVG icons (bomb / hole / two fingers), and Latin-digit formatting for scores and all static UI number labels.
- `src/index.css` — regular result choices show both teams in the first row, with a centered “لا أحد” underneath; trap result has two yes/no buttons.
- `src/data.ts` — converts illustrative category names / year values to Latin digits.

## Verify visually
1. Open any regular question and reveal the answer: **no option selected by default** and Confirm disabled until a choice is made.
2. Normal result: first and second team on row 1, “لا أحد” alone centered below.
3. From the board select **الفخ** on the current team, open a **600-point** question and reveal: only target-team correct/incorrect options appear. Correct = **+600** for target, wrong = **−600** for target, throwing team unchanged.
4. In both help selection and the score strip, the icons match. Check `200`, `400`, `600`, category counts, scores and dates use Western numerals.
5. No Neon, user accounts, database schema, question bank or backend code changes in this bundle. Gameplay remains client-side preview until question content/match persistence work.

**The source repository `HamzaIbrahim123/Baleshhaa` was not modified.**
