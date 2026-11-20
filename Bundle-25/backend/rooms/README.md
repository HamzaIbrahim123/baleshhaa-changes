# Neon Function: baleshhaarooms

Separate backend for the shared room infrastructure. Does not replace the existing auth or Seen Jeem Functions.

Entrypoint: `index.mjs` (Neon Node.js 24 fetch handler).

The deployment must package dependencies `pg` and `@neon/functions` (see parent README). `DATABASE_URL` is supplied by Neon for the branch on which this Function is deployed. Set `ROOM_ALLOWED_ORIGINS`, `ROOM_IP_PEPPER` and `ROOM_PUBLIC_APP_URL` securely.

The state machine uses the same compiled Bundle 24 engine and applies all host commands in one PostgreSQL transaction, guarded by a `FOR UPDATE` lock, idempotency key, and revision. Viewer tokens are random opaque bearer values, hashed before storage. Viewer responses never include answer text except after an explicit reveal.

`GET /health` is a lightweight health check that does not query the database.

The code has been tested in-memory; a Neon Function runtime smoke test and a two-device authenticated session remain required before production release.
