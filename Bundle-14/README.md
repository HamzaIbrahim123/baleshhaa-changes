# Bundle 14 — Figma Make JSX syntax hotfix

Fixes the Vite error `[PARSE_ERROR] Unterminated regular expression` in `src/LiveMatch.tsx:269` after applying Bundle 13.

## Install
Extract **FigmaMake-Changes-Only.zip** into the existing Figma Make project root; replace only `src/LiveMatch.tsx`. Do not re-import the other Bundle 13 files; they remain unchanged.

## Change
A missing closing `}` after the conditional `live-replay-audio` div was added on line 268:
```tsx
{winnerIndex !== null && <div className="live-replay-audio">
  {/* replay control */}
</div>}
```

This is a one-character source fix based on the exact error screenshot and GitHub's Bundle 13 file. No other logic, styling, API, database, user accounts, or sound files were changed.

Verification: exact one-line diff; ZIP signature/CRC validated; Figma Make runtime still requires checking after upload.
