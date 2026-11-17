# Baleshhaa — Bundle 13

This change bundle builds on **Bundle 12**, which is already synced into the original Figma Make source repository.

## Apply in Figma Make
Download **FigmaMake-Changes-Only.zip** from this folder, extract and upload to the **existing project root**. Replace ONLY these 4 files using the included directory paths:

- `src/App.tsx` — all successful sign-in **and** registration flows land on the **home page**, never auto-start a game. Browsing games remains separate from authentication.
- `src/LiveMatch.tsx` — richer custom winner celebration, scoreboard numbers animate, victory audio unlock happens in the Finish click before the Neon request, a replay-sound control appears on wins (respects sound toggle).
- `src/live-match.css` — stage lights, ribbons, rotating gold ring, star showers, fireworks, richer winner card, mobile adjustments and reduced-motion support.
- `src/sfx.ts` — original ~3.5-second synthesized fanfare with warm melody, victory chord, chimes and rhythmic applause, compressor + volume limiting, safe replay. No external MP3, licensed music, or dependencies.

There are **no backend or database changes** and no files other than these 4 under the ZIP.

## Preserved from Bundle 12
- The board rows stay **200/200, 400/400, 600/600**.
- Personal remaining complete games still come from Neon and refresh after returning.
- Tie results stay calm (no winner/fanfare), scores and replay remain present.
- Existing helper timings, scoring rules and account-question tracking are untouched.

## Quick test after import
1. Logged out, click **جرّب الأسئلة الحقيقية** → sign in → verify **home**, not game.
2. Click **إنشاء حساب** → register → verify **home**.
3. From signed-in home, choose سين جيم yourself; verify test match opens normally.
4. In a non-tied match, finish; verify fireworks, stars, confetti, animated score and original win sound.
5. Press **اسمع صوت الفوز مرة ثانية**; verify audio works. Then turn sound off in site settings and ensure the replay button is replaced with a muted note.
6. Test a tie (no confetti/fanfare), narrow mobile viewport, and reduced-motion preferences.
7. Verify per-user remaining games and sorted question rows still work.

**Verification:** Source checks and the ZIP entries' CRC-32 were verified. The interactive Figma Make end-to-end check can occur **after user imports** the ZIP. No source or Neon changes were written outside the changes repository.
