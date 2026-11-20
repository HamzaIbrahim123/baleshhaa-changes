# Bundle 25 — Shared Game Rooms Backend (Letters)

**Scope:** The next incremental development step after Bundle 24. Implements the **room API source**, tests the **Neon database migration on an isolated QA branch**, and updates the typed Figma Make room client. The original Baleshhaa repository, Seen Jeem functions, and production database were **not changed**.

## Apply to the EXISTING Figma Make project

Unzip **`FigmaMake-Changes-Only.zip`**. It contains exactly one changed path:

| Action | Path | Purpose |
|---|---|---|
| **MODIFIED** | `src/letters/roomClient.ts` | Adds `active()` resume and `toggle_edit_mode`, plus a host-side polling fallback that matches the backend. |

Overwrite only the file at that path within your *existing* `src` folder; **do not replace the folder**. Bundle 24's `src/letters/engine.ts` must already be present. Nothing in `App.tsx`, `LiveMatch.tsx` or the existing Seen Jeem CSS needs replacing.

**Expected visible result:** No new game screen appears yet. These are the backend contracts and source required before the two-screen UI can be connected. The `letters` game remains `coming_soon`.

## Backend files — not for the Figma Make source folder

- `backend/rooms/index.mjs`: Neon Function entry point, backed by `pg.Pool` + `@neon/functions`.
- `backend/rooms/service.mjs`: request routing, authentication, room creation/join/host/viewer, optimistic revision, commands, answer-safe display projection and CORS.
- `backend/rooms/db.mjs`: parameterized PostgreSQL repository; atomic row-locked command transactions, idempotency, per-user question usage, hashed viewer tokens, and join rate limits.
- `backend/rooms/engine.mjs`: compiled, dependency-free Bundle 24 rules for Neon Node.js runtime.
- `backend/rooms/package.json`: backend dependencies, separate from the Figma Make app.
- `sql/002_rooms_backend_NOT_APPLIED.sql`: additive schema for the room API, **do not run against production yet**.
- `tests/rooms-service.test.mjs`: behavioral tests using a controlled in-memory PostgreSQL adapter; **not** an end-to-end test against a deployed Function.

## Real Neon QA performed

Project `restless-tree-71310827`, parent branch `br-autumn-pond-b92zfumu`.

Created isolated branch **`letters-bundle25-qa`** (`br-late-math-b9m0r7gn`). The migration ran successfully there as a 12-statement SQL transaction. Verified these five tables are present on QA:

1. `game_rooms`
2. `game_room_commands`
3. `game_room_join_limits`
4. `letter_questions`
5. `letter_user_question_usage`

The branch is intentionally kept for integration testing and is **not production**. The production project branch was left unchanged. No real customer credentials or published question bank were altered.

## API contract

| Endpoint | Authentication | Purpose |
|---|---|---|
| `POST /api/rooms` | signed-in host Bearer | Create a room, best of 1/3/5 |
| `GET /api/rooms/active` | host Bearer | Resume an active room |
| `GET /api/rooms/:code/host` | host Bearer | Private state, including secret answer |
| `POST /api/rooms/:code/join` | public, rate-limited | Join via room code; receive opaque viewer token |
| `GET /api/rooms/:code/viewer` | viewer Bearer | Public-only state + viewer heartbeat |
| `POST /api/rooms/:code/commands` | host Bearer | Atomic `expectedRevision` + `commandId` + command |
| `GET /health` | public | No database secrets |

Supported commands: `start`, `open_question`, `wrong_answer`, `correct_answer`, `both_surrender`, `retry_same_letter`, `toggle_edit_mode`, `cycle_cell_color`, `next_round`, and `end_match`.

**Important:** the client refuses to contact the room API until the backend is deployed and `VITE_LETTERS_ROOM_API_BASE` is configured. Never point it at the existing Seen Jeem Function.

## Tests

From this Bundle's root:

```bash
node --test tests/rooms-service.test.mjs
```

13/13 passed using an in-memory database fake (auth, join, viewer secrecy, revision conflicts, correct-answer lifecycle, surrender retry, edit mode, curved path win, rate-limiting, API responses, match ending). The new `roomClient.ts` also passed strict TypeScript validation against Bundle 24's engine. The migration was validated against an isolated real Neon QA database.

**What has not yet been tested:** the real Neon Function HTTP deployment and authenticated browser-to-server two-device flow, because the existing Functions are deliberately untouched and the new Function was **not** deployed. Those are required before calling the room system live.

## To deploy on QA (later, with a linked Neon CLI environment)

1. Configure a **new** Neon Function slug `baleshhaarooms` on the QA branch. Do not overwrite `baleshhaaapi` or `baleshhaagame`.
2. Install backend dependencies separately (`cd backend/rooms && npm install`). The Neon CLI must **bundle** `pg` and `@neon/functions` into its deploy archive; uploading raw source without dependencies will fail.
3. Required Function environment: `ROOM_ALLOWED_ORIGINS` (explicit Figma Make/app origins), `ROOM_IP_PEPPER` (cryptographically strong, private), `ROOM_PUBLIC_APP_URL` (frontend base URL). `DATABASE_URL` is supplied by Neon when deployed on its branch.
4. Deploy using the Neon CLI `neon functions deploy baleshhaarooms --src ./index.mjs` **from the linked QA branch**. Follow the Neon CLI instructions for branch linking and bundling.
5. Verify `/health`, use a QA-only test account, test create/join/start/host/viewer/commands/reconnection. Seed verified *letter* questions in QA only; existing Seen Jeem questions are not suitable.
6. After QA and separate production review, apply the additive migration to production, deploy the new Function, and update `VITE_LETTERS_ROOM_API_BASE` before integrating the UI.

### Security / production checks still required

- Confirm the legacy `app_sessions.token_hash` token SHA-256 encoding matches the current custom Auth Function; we inferred it from schema, but **did not** authenticate using a real user token.
- Verify trusted client-IP header behavior behind the Neon proxy before relying on IP-based rate limits; the API already requires a secret hash pepper, but headers can be spoofed without trusted proxy configuration.
- Enforce actual allowed frontend origins; do not use wildcard CORS on production.
- Seed a published letter question bank; avoid exposing question answers on the viewer endpoint.
- The first viewer token is replaced when a second display joins; deliberately single-display for this phase.
- Neon Realtime is **disabled**. The Room client uses polling with cleanup instead; do not enable Realtime without planning connection interruptions.
- The room code/share link UI and real backend are not yet connected to the website.

## Handoff / next development step

Connect Figma's approved **Host/Desktop, Host/Mobile and Viewer/TV** UI to this API, add join-by-link/code + QR rendering, perform a full two-browser QA run against the new Function, then curate the Arabic letter-question bank. Do not mark the game `active` until these pass.

Source repository read-only: `HamzaIbrahim123/Baleshhaa`.
Changes repository: `HamzaIbrahim123/baleshhaa-changes`, under `Bundle-25`.
