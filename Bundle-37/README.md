# Bundle 37 — Confirm the winning cell BEFORE awarding the round

## Why this exists
The presenter may tap a letter once to orange, then again for green. If the orange tap happens to complete an orange side-to-side path, the old server immediately awarded the round and locked the board before the presenter could continue to green. This is NOT the intended behavior.

## The new server-authoritative rule
- For a normal (non-winning) cell tap, the color changes immediately: neutral → orange → green → neutral → orange.
- If a **candidate color would complete any team's connected winning path**, DO NOT commit the color, winner, score, or round to the server's public game state yet. Keep them unchanged.
- Instead, persist `pendingWin` in the host's private room state and display a host-only confirmation dialog:
  **«هل فاز فريق [team]؟»** + **«نعم، تأكيد الفوز»** / **«لا، انتقل للون التالي»**.
- «نعم» → server recomputes and commits the winning color in one atomic room command, awarding the round/match, with the spectator screen showing the winner only **after** confirmation.
- «لا» → candidate color is not committed, scoreboard unchanged, modal disappears. Server remembers the declined color privately; next tap of the same cell skips it and tries the next color (orange rejected → green; green rejected → neutral; neutral → orange prompts again).
- Repeated or fast taps cannot force an unconfirmed win; host requests require a room revision and UUID and the presenter uses a synchronous in-flight click guard.
- The same confirmation works in **«تعديل خلية سابقة»** when changing a past cell would produce a winner.
- The popup survives host refresh because it is saved in server state; viewers NEVER receive pending-win data.
- `confirm_win` / `reject_win` are only allowed when `pendingWin` exists.

## Backward-compatible rollout
The new host sends `{kind:'cycle_cell_color',cell,requireWinConfirmation:true}`.
The new Neon function only activates the gate for requests containing that flag. Existing published frontend instances **without the flag** continue to behave as before until Figma Make is updated. This avoids breaking an in-progress room during rollout. Once the new presenter UI is published, the warning popup protects winning clicks.

## Files to import into Figma Make
Download **`Bundle-37/Changes-Only.zip`** and replace exactly these three existing files in the *same* project (after Bundle 36):
- `src/letters/HostGameControls.tsx`
- `src/letters/HostGameControls.css`
- `src/letters/roomClient.ts`

**No other source files need replacing.** Do not upload Neon backend files into Figma Make. Under the host's room code, the updated UI shows a small `v37` marker so you can verify that the new client was actually published.

## What was changed on Neon?
Only the separate letters-room Function's logic; **no migration, no new table, no question-bank change, no Seen Jeem data changes**. The backend build, QA tests and deployment are separate from the single Figma Make ZIP.

## How to test
1. Import Bundle 37 into the current Figma Make project and Publish.
2. Open the host room; verify a tiny `v37` next to the code.
3. Start a match and build an orange connected path ending with one unpainted cell.
4. Tap that final cell once. Popup appears BEFORE the winner is awarded.
5. Press «لا». The cell stays its original color; another tap makes it **green**. Next tap **neutral**, another tap **orange** and popup appears again.
6. Press «نعم» to complete the orange path; only then will the viewer see the winner and scoreboard update.
7. Try a winning green vertical path too. Green will also require confirmation.
8. Test the same behavior when correcting an earlier asked cell.

## Technical QA
- `Bundle-37/qa/win-confirmation.mjs`: deterministic service tests for no premature winner, NO→green, NO→neutral→orange re-prompt, YES commit, best-of-3 round vs match finish, and editing older cells
- `Bundle-37/qa/qa-real-winning-room.mjs`: separate disposable QA user and QA room, real REST commands, viewer state before and after the confirmed win
- GitHub Actions `build-bundle37.yml` validates TSX and creates one changes-only frontend ZIP and a separate deployment artifact for Neon
- The pending-win and declined-color fields are host-private and are excluded from `publicState()`
