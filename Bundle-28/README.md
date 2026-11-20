# Bundle 28 — Host gameplay controls (changes only)

Upload the SINGLE `Changes-Only.zip` to your EXISTING Figma Make project. Do not replace the src folder.

Modified:
- `src/letters/RoomLobby.tsx` — mounts host controls after room start.
Added:
- `src/letters/HostGameControls.tsx` — 25 letter choices, edit colors, question/answer host-only, correct/wrong/surrender/retry, rounds, final winner/loser and confirm end.
- `src/letters/HostGameControls.css` — scoped responsive RTL design.

Nothing changes in Seen Jeem, database, Neon environment or backend. 
This stage does NOT make room creation work: the production Neon Room Function, production additive schema, Figma Make VITE_LETTERS_ROOM_API_BASE, verified CORS, and curated letter questions are still missing. Do NOT launch a public game based on these UI files.

Notes: The server decides legal moves, answer visibility and winning paths. The UI sends commands with expectedRevision and commandId; refreshes on revision conflict. No secrets in the client.
