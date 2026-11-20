# Bundle 26 — Live room lobby and verified QA function

**User delivery: one ZIP only** `Changes-Only.zip`, with precisely 3 new/modified source files (no embedded archive).

| Action | Path | Target |
|---|---|---|
| NEW | `src/letters/RoomLobby.tsx` | Figma Make `src/letters/` |
| NEW | `src/letters/RoomLobby.css` | Figma Make `src/letters/` |
| MODIFIED | `backend/rooms/index.mjs` | Separate Neon Functions backend only — NOT under Figma Make `src/` |

**Do not delete or replace the existing `src` directory.** Bundle 24's `src/letters/engine.ts` and Bundle 25's `src/letters/roomClient.ts` remain unchanged.

## What is implemented
- A standalone React host/viewer lobby component with RTL/right-aligned Arabic copy and centered hex letters. It exports `LettersRoomLobby` and has a scoped stylesheet matching the Letter Arena design system.
- Host: create/resume room, team names, best-of 1/3/5, share link/code, watch viewer presence, and start a match with revision-safe commands.
- Viewer: join with code or shared link, resume cached viewer credential, watch live state, show synchronized 25-cell board, hide the correct answer until reveal, and show winner and loser side by side.
- QA backend: fixed the initialization timing bug. Neon injects custom environment variables at request dispatch; the function now initializes `pg.Pool` and the HTTP handler lazily on first request.
- Backend bundle built on GitHub Actions and deployed to **QA branch only**, slug `baleshhaarooms`. Never replaced `baleshhaaapi` or `baleshhaagame`.

## Tested
- Strict TypeScript check for the new React component and the existing room client/engine: PASS (local React typing shim; full browser build pending app integration).
- 13/13 service tests PASS (mock repository).
- Real Neon QA function smoke test (GitHub Actions run 44806225828, attempt 3): HTTP status 200 health, 401 unauthenticated host, 403 untrusted Origin, 204 preflight, and 404 joining nonexistent room against real QA database.
- Five schema tables were already added to isolated branch `br-late-math-b9m0r7gn` in Bundle 25. Production schema and game status untouched.

## Not yet completed
- **Not a deployed production site feature.** These UI modules are not wired into `src/App.tsx` yet and will not display automatically.
- QA host-authenticated create/start/end and two physical browser/device integration still require an isolated test account and frontend origin configuration.
- QR graphic generation, complete host question administration, and Arabic letter question bank are later stages.
- Keep `games.letters` as `coming_soon` until full QA. No Neon Realtime changes.

## Next step
Mount `LettersRoomLobby` in the existing route infrastructure with a controlled feature flag; configure `VITE_LETTERS_ROOM_API_BASE` for the correct verified environment and actual allowed frontend Origin; then perform authenticated host/viewer browser test and progressively implement full game controls.

**Sources:** Original `HamzaIbrahim123/Baleshhaa` read only. Changes committed to `HamzaIbrahim123/baleshhaa-changes` under Bundle-26.
