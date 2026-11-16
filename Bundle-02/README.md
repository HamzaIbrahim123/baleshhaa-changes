# Bundle-02 — Live Neon auth and Admin integration

**Baseline:** [HamzaIbrahim123/Baleshhaa](https://github.com/HamzaIbrahim123/Baleshhaa) at original Figma Make project.
**Changes:** Only files added/modified for real username/password accounts, auth sessions, an admin dashboard, and Neon API.

### COPY THESE 3 FILES into Figma Make root (preserve paths)

- `src/App.tsx` — **modified**: real signup/login/logout, admin link, admin dashboard and change-credentials form.
- `src/index.css` — **modified**: admin dashboard and settings styling.
- `src/api.ts` — **new**: public function endpoint and typed API client; no database credentials.

### Backend code: DO NOT copy into Figma Make

- `backend/function/index.mjs` — new server code already deployed on Neon Functions as `baleshhaaapi`.
- `backend/migrations/001_auth_catalog.sql` — DDL already applied to the new Neon database.
- `backend/README.md` — deployment status, routes and verification.

Neon Console: https://console.neon.tech/app/projects/restless-tree-71310827

**Current status:** Neon project and 5 tables created, four game names seeded; Neon Function deployment 4 is completed. Temporary admin is configured as a private hashed secret in Neon Function env and will be inserted on the **first API request**. The API has not been end-to-end tested from the published Figma Make site yet.

**Testing:** Open Figma Make Preview after importing 3 files → try real registration → confirm Neon app_users count → log in as temporary admin and verify users list → change temporary credentials. The design remains light RTL as approved.

**Important:** Seen Jeem categories, example questions, and game state are still illustrative pending approved content/server-side match logic. No password or Neon connection string is committed. Figma Make `vite.config.ts`, `package.json`, `.figma/`, original `public/` images must remain unchanged.

Consult `bundle-manifest.json` for exact paths.
