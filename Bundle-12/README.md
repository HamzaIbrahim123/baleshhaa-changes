# Baleshhaa — Bundle 12

## Upload to Figma Make
Download `FigmaMake-Changes-Only.zip` from this folder. Extract it at the **root of the existing Figma Make project**, replacing only these exact files:

- `src/App.tsx` — display per-account remaining full games on every Neon category card, including after returning from a completed match; show public initial inventory to guests and 0 for categories without questions.
- `src/LiveMatch.tsx` — sort each category's six question tiles into 200/200, 400/400, 600/600; show updated full-game balance on the board and results; add original festive win/tie presentation and Play Again.
- `src/live-match.css` — brand-aligned animated confetti, fireworks, trophy reveal, winner green / opponent neutral score cards, mobile layout and reduced-motion accessibility.

**No other files are in the ZIP.** Do not replace `src/data.ts`, `src/api.ts`, the Neon functions, database, or the GitHub source repo.

## How remaining games work
A full game requires **two** questions at each of the **200/400/600** point levels. The guest count is the published public pool, currently 15 complete games per ready category. A signed-in player's balance comes from the protected `/api/player/progress` endpoint (`remainingGames`) and is reloaded when they return from the match. Different accounts can have different balances; cards never pretend that a public count is their personal count. An unavailable category shows 0 games.

In the live match, balances refresh when scoring and finishing. The results card shows remaining games for the two ready categories.

## Verification and deployment note
- GitHub sources were read from the latest synced `HamzaIbrahim123/Baleshhaa` baseline and only these three files were changed.
- Code-level checks verified the point ordering, authenticated progress fetch, winner/tie/runner-up states, score rendering, replay reset and responsive reduced-motion styles.
- No Neon tables, user accounts, question bank or deployment functions were changed.
- **The Figma Make browser end-to-end check must be done after importing these 3 files**. In particular confirm animations, refresh of balances, replay and desktop/mobile layout.
- The reference Seen Jeem celebration was used for creative direction, not copied literally; art and motion use Baleshhaa styles.

## Test suggestions
1. Run a signed-in account with remaining inventory and view each category (e.g. `باقي 14 من 15 لعبة`).
2. Start a two-category match and confirm each category displays 200/200, 400/400, 600/600.
3. Finish a match with unequal scores to see winner highlighted green, other team neutral, celebration particles, both scores, restart/exit.
4. Finish a tied match, then check both cards are neutral/blue and no loser is declared.
5. Return to categories; confirm that the count is reloaded from Neon (not static).
6. Check reduced motion and narrow mobile width.

No changes were made to the original GitHub repository by this bundle.
