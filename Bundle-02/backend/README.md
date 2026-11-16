# Baleshhaa live API — Neon Functions

**Live Neon project:** `restless-tree-71310827` · branch `main` · database `baleshhaa` · PostgreSQL 17.

**Function slug:** `baleshhaaapi`.
**Public URL:** `https://br-autumn-pond-b92zfumu-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech/`

This folder holds source for a function deployed to Neon (Node 24), **not a process to run in Figma Make**. The server receives the Neon `DATABASE_URL` from Neon Functions' private environment; never expose it to Figma or GitHub. Neon Functions currently shows deployment 3 as `completed`. HTTP request/response and end-to-end sign-in have **not yet been independently verified** from this environment.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/health` | Public DB connectivity check |
| GET | `/api/games` | Public seeded game catalog |
| POST | `/api/auth/register` | Public; username, displayName, password (min 10) |
| POST | `/api/auth/login` | Public; username and password |
| GET | `/api/auth/me` | Authenticated Bearer token |
| POST | `/api/auth/logout` | Authenticated Bearer token |
| POST | `/api/auth/change-credentials` | Authenticated; oldPassword, newPassword, newUsername |
| GET | `/api/admin/stats` | Admin only |
| GET | `/api/admin/users?page=1` | Admin only |

Passwords are salted/hashed with scrypt in the server; session tokens are hashed in Postgres. The user's browser stores only the session token. Never store the temporary admin password in this repo.

## Temporary Admin bootstrap

Neon Function deployment contains `INITIAL_ADMIN_USERNAME` and a **scrypt hash**, `INITIAL_ADMIN_HASH`, as private environment variables, not GitHub source. On the **first API request**, the function inserts the temporary admin account if the username does not exist. This is a one-time idempotent bootstrap.

The account will not appear in `app_users` until an API invocation executes. After verifying successful admin sign-in, remove the bootstrap variables from the function environment and change username and password inside the protected Admin page. Do not ship public onboarding with this bootstrap enabled long term.

## Verification checklist

1. Import only the three `src/` files from Bundle-02 into Figma Make (keep every other original file unchanged).
2. Open the new Figma Make Preview. Trigger any API request, or open `/api/health` at the Function URL.
3. Check `app_users` in Neon for the seeded admin.
4. Log in as admin; confirm Admin panel counts and user list, and that ordinary players cannot access `/api/admin/*`.
5. Register a new player; confirm a new `app_users` row; log out and log in from a fresh browser; confirm sessions.
6. Change temporary admin credentials through the protected Admin form and confirm old credentials no longer work.

**Limits:** This stage implements real accounts + sessions + an Admin overview. No vetted question bank exists; Seen Jeem score/gameplay visuals are still browser-local examples, not production game persistence. Public-facing production hardening (WAF/rate limits per source IP, stricter origin allowlist, dedicated domain, security review and backup policy) is still needed.
