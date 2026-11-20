# Bundle 24 — Letters Game (development foundation)

## Scope
This is **phase 1**, the tested game engine + proposed shared-room contract and database migration. It is **not** the completed online multiplayer game. Do not claim the existing Neon Function already supports these endpoints.

## Exact changes to apply in Figma Make
Only copy these NEW source files into your existing Figma Make project:

- `src/letters/engine.ts` — pure 5x5 hex rules, letter selection, attempts, ownership, winding-path victory, Best-of-1/3/5, per-round color swap and safe display projection.
- `src/letters/roomClient.ts` — typed *future* room contract. API calls refuse to run until `VITE_LETTERS_ROOM_API_BASE` points to a deployed backend.

Keep `src/App.tsx`, `src/LiveMatch.tsx`, existing CSS, files and Neon Functions unchanged. No new dependencies required. The game stays flagged `coming` until the server and integration stages pass QA.

## Unapplied database migration
`sql/001_game_rooms_letters_DRAFT.sql` is an **inspection/proposal**, not automatically executed. It creates shared `game_rooms`, `game_room_commands`, plus dedicated `letter_questions` and `letter_user_question_usage`. It does **not** alter Seen Jeem's `app_matches`, `app_questions`, or `app_user_question_usage`.

## Verified project findings
- Source: React 19 + Vite + TypeScript; `src/App.tsx` is the current app entry and `src/LiveMatch.tsx` is Seen Jeem's play UI.
- Auth token is stored under `baleshhaa:auth-token:v1`; existing `src/api.ts` talks to a separate Neon Function.
- Existing Seen Jeem matches are restricted by `app_matches_one_active_per_user`; their 200/400/600 question schema cannot model letter questions.
- Neon Realtime is currently **disabled**. The client contract supports a safe polling fallback with clean stop behaviour, but the endpoint does not exist until backend implementation.
- The existing API implementation is deployed separately as Neon Functions; editing React source does not add REST routes to those functions.

## Backend contract to implement next

```
POST /api/rooms                         host Bearer auth; creates letters room
GET  /api/rooms/:code/host              host Bearer auth; private game state
POST /api/rooms/:code/join              public rate-limited code join; returns viewer token
GET  /api/rooms/:code/viewer            viewer token; public state ONLY
POST /api/rooms/:code/commands          host auth + expectedRevision + commandId
```

Each command is executed by the server in an atomic transaction with a revision check, permission validation and idempotency key. Questions for the host have `answer` but the viewer projection does not include it before reveal.

## Tests (executed locally)

```
node --experimental-strip-types --test tests/letters-engine.test.mjs
```

11 tests cover letter uniqueness; 6-neighbor graph; green/amber winding wins; invalid disconnections; team/color swaps; answer normalization; answer secrecy; retries; scoring; correction cycles; Best-of-3 finish. No live database or other user's data was touched.

## Figma reference
Design: `https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=292-401`

Next: implement the authorized Room API in Neon Function, test migration on temporary branch, then connect the host and viewer UIs.