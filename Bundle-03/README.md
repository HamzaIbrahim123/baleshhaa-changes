# Bundle 03 — Player UI refinements + Admin Content Studio
Date: 2026-11-16

## Import into Figma Make
Download **FigmaMake-Changes-Only.zip** from this folder. Extract and COPY ONLY these five project-relative files into the root of the existing Baleshhaa Figma Make app:

| Action | Path | What changed |
|---|---|---|
| Replace | `src/App.tsx` | Centered 4/6/8 selection, visible locked categories, 0/3 helps initially, five help icons, Admin Studio panel |
| Replace | `src/index.css` | New selected/disabled/locked styles and responsive admin UI |
| Replace | `src/data.ts` | Explicit demo-category unavailability reasons |
| Replace | `src/api.ts` | Admin API client, content management calls, image upload support |
| Add | `src/AdminStudio.tsx` | Users detail/disable/enable + Games / Sections / Categories / Manual Questions management |

**Do not import `backend/` into Figma Make.** It runs separately on Neon.

## Neon backend (already updated)
- Project: `restless-tree-71310827`, database: `baleshhaa`.
- Additive SQL migration: `backend/migrations/002_admin_content.sql` applied; existing users and sessions retained.
- Neon Function: `baleshhaaapi`, deployment **5**, status **completed**, source `backend/function/index.mjs`.
- New tables: `app_media`, `app_sections`, `app_categories`, `app_questions`; existing `games` table extended with description and optional image.
- Admin authorization is enforced by the backend's role checks, not only by hidden UI controls.
- Player user management: read account details and **disable/enable** a player. Disable revokes active sessions; permanent deletion is deliberately deferred.
- Games: create/edit and active/coming soon/hidden; sections: create/edit, image optional; categories: create/edit, **image required**; question: manual create/edit and draft/published.
- Uploaded images: PNG, JPG, WebP, <=1MB, persisted in Neon Postgres for this MVP.
- No source files contain Neon database secrets or passwords.

## What is intentionally NOT done yet
- **Question bank generation via AI**, CSV/Excel/JSON bulk import, AI draft review workflow: future stage.
- Backend match creation, per-user seen-question tracking, real gameplay from admin questions: future stage. The player Seen Jeem board still uses explicitly marked demo questions. Do not treat it as production gameplay.
- Hard-deleting users, games, sections or questions: future stage, to avoid destroying related data.
- Production browser end-to-end/API write tests have not been independently completed in this environment. Verify Figma Make Preview after copying the 5 files, then test an admin create/update plus a regular-player disabled account. Keep using existing credentials; no new default admin password was created.

Original Figma design: https://www.figma.com/design/F8QbCCsYhe27xaDWFygUlK/Untitled?node-id=127-140
