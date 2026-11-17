# Bundle 15 — Enable Barcelona, Real Madrid & El Clásico in live Seen Jeem

**Database already populated directly in Neon**: 90 published questions for each of Barcelona, Real Madrid and El Clásico; 30 questions per 200, 400 and 600 points. Existing Champions League and World Cup categories remain at 90 questions each. Total: **450 published questions across five categories**.

This ZIP contains ONLY three *modified* Figma Make frontend files:
- `src/App.tsx` — send all currently eligible Seen Jeem categories from Neon into live match flow, not just a hardcoded Champions League / World Cup pair.
- `src/LiveMatch.tsx` — initial selector for 4/6/8 categories with 2-category **test mode**, personal remaining-games counts, and confirmation before starting team setup. Unavailable counts are disabled.
- `src/live-match.css` — responsive category selector UI consistent with current design system.

Import the ZIP into the current Figma Make **project root**, replacing the three source files. No data in this public GitHub repository includes the real question texts. Nothing in Neon needs to be imported: questions were already published there. Player usage, existing question bank, and Neon backend are unchanged.

**Current available categories**: Champions League, World Cup, Barcelona, Real Madrid, El Clásico (5). Thus 4 categories per normal game can be selected now; 6/8 options are disabled until more eligible categories have question banks. Two categories remain available as a clearly labelled TEST.

## QA after import
1. Sign in and navigate to **Seen Jeem → Real game**, then choose four categories (include Barcelona, Real Madrid and El Clásico).
2. Verify their account-specific remaining games show 15 on fresh accounts, potentially less for existing categories if already played.
3. Choose three helper tools per team and start a normal 4-category match.
4. Verify 6 questions per chosen category are ordered 200/200 → 400/400 → 600/600.
5. Test opening/revealing/finishing without question repeats and ensure the celebration still works.
6. Try the 2-category test mode and verify it retains previously supported behavior.

**Source checks:** Source-based static checks, balanced delimiters and ZIP structure verified. The Figma Make interactive preview still needs to be exercised after import.
