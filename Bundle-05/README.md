# Bundle-05 — Time-restricted Seen Jeem help actions

## Files to import into Figma Make

This bundle is **only two changed application files** relative to the current `HamzaIbrahim123/Baleshhaa` baseline:

- `src/App.tsx` — enforces when each help can be activated in the game, resets reveal state between questions, blocks selecting multiple different helps for one question, and correctly marks used helps unavailable.
- `src/index.css` — visibly greys out disabled helps while preserving the original layout and the previously agreed icon set.

Download `FigmaMake-Changes-Only.zip`, extract it into the root of the Figma Make project and replace those two files; **do not import the enclosing Bundle-05 directory**.

### Exact timing (from existing `src/data.ts` definitions)

| Help | Eligible time |
|---|---|
| الحفرة | On the game board, before opening a question |
| استريح | On the game board, before opening a question |
| الفخ | On the game board, before opening a question |
| اتصال بصديق | Once a question is open, before revealing the answer |
| جاوب جوابين | Once a question is open, before revealing the answer |

On any other stage, for a team that does not have the turn, after another help is selected, or after use, the help button is truly `disabled` and visibly dimmed. A chosen pre-question help remains highlighted but cannot be changed after the question opens. Revealing the answer locks all helps even if you navigate back to the question. Once a help is used and the answer is confirmed, it remains disabled for the rest of the match.

### Scope

Only the helper timing/states were changed. Existing player authentication, Neon/API, admin pages, questions, score calculation, and the original help icons were not modified. The real question bank and server-side match persistence are still separate future work. **The original `HamzaIbrahim123/Baleshhaa` repo is not edited by this bundle.**

### Suggested Figma Make check

1. On the board: try the 3 pre-question helps; the post-question helps should be disabled.
2. Open a question: pre-question helps should be disabled; post-question helps can now be used.
3. Reveal the answer: none can be selected, including after returning to the question page.
4. Confirm the answer: used help is greyed out permanently; all other applicable helpers can be selected in their allowed stage for the next question.
