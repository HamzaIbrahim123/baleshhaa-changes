# Baleshhaa — Bundle 11: Real Seen Jeem test mode

## Import to Figma Make (ONLY four frontend files)
Download **FigmaMake-Changes-Only.zip** from this folder. Extract into the existing Figma Make project's **root**, replacing paths as shown:

- `src/App.tsx` — a real Seen Jeem test button in the game details, launches the authenticated game UI and fixes the three statistics cards' surrounding layout via imported CSS. Keeps the existing demo and admin UI intact.
- `src/liveApi.ts` — client for the new Neon Game Function.
- `src/LiveMatch.tsx` — new playable 2-category test flow backed by Neon, including score controls, team names, help selection and timing, question/reveal, result and match close/abandon.
- `src/live-match.css` — real game styles, responsive controls, and fixes the 3 details-page fact cards.

**Do NOT copy `backend/` into Figma Make**. Backend deployment and database migration are already complete.

## Live Neon infrastructure (already deployed)
- Project `restless-tree-71310827`, PostgreSQL database `baleshhaa`.
- Original account/admin API `baleshhaaapi` **unchanged**.
- New independent Game Function `baleshhaagame` deployed (revision 1, status completed).
- 180 **published** questions: 90 Champions League and 90 FIFA World Cup; each has 30 questions at 200/400/600 points.
- One erroneous existing answer ("9 مرات") was corrected to **"يوفنتوس"** for `UCL-600-27`.
- New tables `app_matches`, `app_user_question_usage`, `app_match_questions`. Stored DB function opens an unused question atomically, returns the same question on retry and NEVER reveals the answer until a separate protected endpoint.
- `backend/function/index.mjs` is the deployed Game Function source (for backup).
- `backend/migrations/003_matches_per_user.sql` records the already-applied schema (for backup).
- User accounts and 12 other categories are intact. No non-test match is playable with fewer than 4 categories; a **clearly labelled test mode** permits 2 categories while only these are ready.

## How to test
1. Import the ZIP into Figma Make. Navigate to سين جيم → **جرّب الأسئلة الحقيقية**.
2. Sign in to a real Neon account. The login token is shared with the existing auth API.
3. Choose names and exactly 3 helps for each team; select **ابدأ المباراة الحقيقية**.
4. Open a 200-point question, answer verbally, click **اكشف الإجابة**, then pick the winner or «لا أحد».
5. After confirmation, its cell becomes unavailable; a user-specific question is marked used. Repeat with 400/600.
6. Finish the match to save final scores; after a new match, verify no old question is repeated on that same account.
7. Use a second account to confirm it still has full question inventory.
8. Check three centered fact cards on the Seen Jeem details page, desktop and mobile.

**Important:** Opening a question consumes it for that account even if the match is abandoned. Unopened questions remain available. Test plays consume real inventory, so use a dedicated test account if desired.
**Current limitation:** After reloading a match, an unfinished match must be explicitly abandoned before starting another; full mid-match recovery is not yet implemented. Server-side match state records opening/usage, final scores, and status, not every in-flight client control. The winner **visual redesign is intentionally deferred** as requested.
**QA status:** DB transaction tests passed (idempotent open and cross-user consumption isolation, both rolled back). Source-level checks passed. The Neon Function status is completed; interactive browser/HTTP end-to-end remains to be confirmed in Figma Make after import.

Do not overwrite or push into the original `HamzaIbrahim123/Baleshhaa` GitHub repo with this bundle. Only the change repository was modified. Question text is intentionally stored in Neon, NOT in this public source-control bundle.
