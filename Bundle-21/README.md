# Bundle 21 — Restore real category photos and finish Seen Jeem QA

## What to import into existing Figma Make
Import `FigmaMake-Changes-Only.zip` at the project root. ZIP contains **only**:
- `src/App.tsx`: use the 14 approved real category photos; in-game sound setting.
- `src/LiveMatch.tsx`: real category photos on board, new audio cues, sound toggle, winner-only result.
- `src/categoryCover.ts`: new canonical category-to-existing-WebP mapping.
- `src/category-photos.css`: remove fragile CSS selectors based on alt text and `opacity:0`.
- `src/live-match.css`: responsive sound button, single-winner display, question transition.
- `src/sfx.ts`: 7 locally synthesized sound effects (win, pit, trap, question, reveal, correct, next).

The original 14 photos already exist in the Figma Make project as `public/art/categories/*.webp`, verified HTTP 200 with valid WebP dimensions. DO NOT overwrite or delete these assets. Uploaded question images (flags, maps, landmarks) remain linked dynamically to Neon `app_media.image_id`.

## Root-cause analysis
Bundle 20 changed the category image alt attribute, but legacy `category-photos.css` matched the *old exact alt text* and hid the Neon SVG illustration. The CSS rule failed and icons reappeared. Category covers are now ordinary `<img src="/art/categories/*.webp">` elements, never dependent on alt text.

## Automated QA performed
- TypeScript 5.7.3 **strict check passed** across the new app and imported modules.
- esbuild generated a full test app; browser page-error count: zero.
- Playwright Chromium 145 **authenticated mock-API browser flow** passed for 4 (four columns), 6 (three columns), 8 (four columns) categories: selection, teams + 3 helps each, game creation, approved WebP images, question with real image, answer reveal, scoring, finish, winner-only screen, play again.
- All five assists validated interactively: pit (pre-question), rest (opponent/pre-question), trap (after question), two answers and friend; scores and spent flags correct.
- Mobile 390px tested: no horizontal overflow and one-column board. A tied match displays a neutral tie without confetti.
- Actual browser image from Neon loaded with `naturalWidth=320`.
- Confetti animation computed style includes `liveConfettiFall` when motion is allowed.
- In-match mute/unmute persisted `baleshhaa:sound` as on/off.
- WebAudio mock scheduled all seven sound types (including the original victory fanfare).
- Neon read-only check: 1260 published questions, 117 questions with images, 0 missing media references, 14 eligible categories.
- GitHub ZIP headers and CRC32 verified.

## Limits — final live-site acceptance
The full automated browser flow used **mock authenticated match responses** so no real player questions were consumed. We did NOT run an authenticated production game nor audibly listen to speakers. After importing into Figma Make, preview/publish and conduct one real match, including audio playback on the target device, before treating the live-site release as completely accepted.

Only the changes repository is modified. This bundle makes no changes to the original source repository, Neon, or users.
