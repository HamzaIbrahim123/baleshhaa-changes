# Bundle-06 — Correct Rest / Trap timing + original celebration sounds

## Apply to Figma Make

Download **FigmaMake-Changes-Only.zip** and copy these 4 files into the **root** of the Figma Make project, preserving paths:

- `src/App.tsx` — updated turn ownership, Rest pending/consumption, correct Trap timing, sound triggers and mute control
- `src/index.css` — unobtrusive sound on/off control without changing the helper bar layout
- `src/data.ts` — corrected Trap timing and opponent Rest explanation
- `src/sfx.ts` — new Web Audio effects synthesizer; no outside sound assets, copyrighted material, or API calls

The included `App.tsx` and CSS **include the prior Bundle-05 changes**, so this ZIP can be applied over the latest Figma Make build without importing older bundles again. Source of truth is the latest GitHub changes repository. The separate `Baleshhaa` repository is not modified by this commit.

### Timing

| Help | When | Team |
|---|---|---|
| الحفرة | On board before opening a question | Team whose turn it is |
| استريح | On board before opponent's question opens | **Opposing team only** |
| الفخ | After the question opens and before reveal | Team whose turn it is |
| اتصال بصديق | After question opens and before reveal | Team whose turn it is |
| جاوب جوابين | After question opens and before reveal | Team whose turn it is |

`استريح` is a verbal action: the opposing team chooses **one player from the active team** who sits out that question. There is currently no roster of individual players, so the site can't enforce which person speaks. The selected Rest remains pending through the question and is **consumed against the opposing team** on confirmation. It can be deselected before the question opens; if the question is exited without confirming its answer, the pending Rest remains available on the board. The active team may independently choose its own eligible help.

All helpers are genuinely disabled outside their timing, after use, or when not eligible. Trap scoring remains correct: targeted team +points if correct, −points if wrong; throwing team's score unchanged.

### Sounds (user-facing, optional)

- **Win:** bright ascending fanfare when a non-tie winner is declared
- **Pit success:** rising surprise/sparkle when the owner of `الحفرة` answers correctly
- **Trap failure:** low explosion impact only when targeted team answers incorrectly

The sound module synthesizes **original** effects in the browser using Web Audio; no downloadable media files, dependencies, or external services. The top navigation has a mute/unmute toggle whose preference is saved locally. If a browser blocks sound, gameplay continues normally. No sound on draw, pit failure, or successful trap defense.

### QA recommendations

1. Current turn A: B's `استريح` is enabled on board, A's is disabled. Swap teams and repeat
2. A's `الحفرة` can be enabled independently of B's pending `استريح`
3. Open a question: Rest is locked, and A's `الفخ` becomes enabled until reveal
4. Confirm the question: Rest gets consumed against B, not A; both remain visually disabled after use
5. With sound enabled, test winning an entire match, a successful pit and a failed trap. Toggle sound off and confirm silence

Backend, Neon, authentication, content admin, and question-bank data are unchanged. Match gameplay remains a client-side demonstration pending the later question/persistence work.
