# Bundle 38 — Arabic Letters Trivia Bank Expansion (2026-11-22)

## Production state — checked on Neon
- Neon Project: Baleshhaa - Live Games Platform (`restless-tree-71310827`), MAIN branch `br-autumn-pond-b92zfumu`.
- Previously published: **280** original questions, **10** per Arabic letter.
- Added in this bundle: **1400 original Arabic quiz questions**, **50** per letter.
- **Now live: 1680 published questions, exactly 60 per letter, 28 letters.**
- Difficulty distribution of all published items: easy 1074 / medium 493 / challenge 113.
- Topics include science, geography, Islamic culture, Arabic, animals, food, football, sports, history, technology, mathematics, arts, environment, and more.
- **Original goal 100 per letter (2800): NOT complete.** 40 more per letter / 1120 more verified questions would be needed. We deliberately did not invent filler to reach the target.

## What was changed?
**Database question records only**: 1400 new records inserted with deterministic UUIDs and `ON CONFLICT DO NOTHING` in 10 batches. **No database schema migration and no Frontend ZIP** were needed.
Source records live in `content/expansion-01.json` through `content/expansion-08.json`, each 175 questions.
Existing pilot records remain in `Bundle-35/content/pilot-01.json` through `pilot-04.json`.

The question fields are `leading_letter`, `question_text`, `answer_text`, `category`, `difficulty`, `status='published'`, and `source_reference='original:expansion-38:editorial'`.

## Quality gates
- Every new answer was selected with a clue designed to lead to it, and the tougher factual and lexical topics were reviewed during curation. Original quiz content; not copied from a game show.
- Automated structural checking rejects mismatched initial letters, duplicate answers **within a letter**, duplicate question texts, answers leaked literally inside clues, malformed fields, unexpected counts, and out-of-range difficulty. 1680 rows / 60 per letter passed.
- QA Neon branch `br-late-math-b9m0r7gn` contains the same 1680 questions. Live integration test creates a disposable QA host & viewer, checks 28 counts of 60 each, draws a question, confirms its initial letter, checks that the viewer cannot see an unrevealed answer, checks count decrease to 59, retries a different question, and sees count decrease to 58.
- Production verification: 1680 published / 60 per letter, no change to `app_questions` (Seen Jeem questions 1260), `app_matches` (19), `app_users` (3), `game_rooms` (2), or question usage records (15) from the recorded before/after snapshot.
- **Important scope:** The mechanical validator verifies formatting, consistency and non-duplication; it cannot independently prove every trivia fact. These are editorially authored and high-confidence questions, not a claim of independent external source verification for all 1680. Questions with potential ambiguity should be flagged for further review rather than treated as infallible.

## What the user should do
**Nothing to upload to Figma Make.** The existing live `roomClient.ts` / Bundle 37 UI reads the updated questions from Neon automatically:
1. Open `https://baleshhaa.figma.site` as host and start or resume a Letters room.
2. Click a starting letter and verify a genuine question is returned.
3. The private "remaining questions" count reflects that host's **previous usage**. A completely new host account begins with 60 for each letter; after revealing a question it becomes 59, and further draws never repeat that question for that host.
4. In a room open two different questions, then use the surrender/retry flow to check a distinct question arrives for the same letter.
5. The spectator screen still cannot see the answer until the presenter reveals it.

## UI implications
No required UI file changes from expanding the question inventory alone.
Possible follow-up polish (only if requested): show the remaining per-letter count on hover in host view; add a compact low-inventory warning; allow admin/editor review and correction of questionable questions before publishing; do not show answers on the spectator view.
Note: 60 is a bank-wide maximum per letter. Existing presenters can see less because previously viewed questions are tracked per account.

## Files and workflows
- `content/expansion-01.json` … `expansion-08.json`
- `content/validate-and-seed.mjs`
- `content/seed-added-1400.sql`
- `qa/live-question-inventory.mjs`
- `.github/workflows/build-bundle38-content.yml`, `.github/workflows/test-bundle38-qa.yml`

Next content goal: **40 more accurately fact-checked questions per letter**, with special editorial attention to ذ / ض / ظ and ambiguous geographic or scientific wording.
