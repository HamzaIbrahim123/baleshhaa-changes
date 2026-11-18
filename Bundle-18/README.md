# Bundle 18 — Baleshhaa dynamic media / image-backed questions

## What is actually live in Neon
- Created Neon Object Storage bucket: `baleshhaa-public-media`, **public_read**, main branch `br-autumn-pond-b92zfumu`.
- Added additive `app_media.storage_bucket`, `storage_key`, `sha256`; legacy `image_data` is now nullable, with a check that *either* legacy bytes or a storage reference must exist. Indexes enforce unique SHA-256 and keys.
- Preserved the existing 14 SVG media rows. The 990 currently published questions remain unchanged and have no question image yet.
- **Deployed** `baleshhaaassets` v1 Neon Function: accepts PNG/JPEG/WebP up to 3MB from validated logged-in admins, stores file in Object Storage, deduplicates SHA-256, writes an `app_media` record with a stable UUID, serves any `/api/assets/:id` via redirect (or old bytes fallback).
- **Deployed** `baleshhaagame` v2: on opening a question, returns optional `imageId` in addition to the same text/id/points. No scoring or question allocation changes.

## Figma Make import (front-end only)
Download `FigmaMake-Changes-Only.zip` and extract at the **root of the same Figma Make project**, replacing only the six files:

1. `src/App.tsx` — image display uses dynamic media UUIDs for catalogue cards.
2. `src/AdminStudio.tsx` — admin image uploads go to Neon Storage. Added upload-many panel under Questions, CSV imageId export, and optional reuse of existing imageId.
3. `src/LiveMatch.tsx` — display optional image directly with the question, both before and after revealing the answer; category image URL is UUID-based.
4. `src/liveApi.ts` — `OpenedQuestion.imageId` optional field.
5. `src/live-match.css` — responsive presentation of image-bearing question.
6. `src/imageApi.ts` — new shared object-media URL builder and authenticated upload API.

**Do not upload backend files or SQL migration to Figma Make.** Those changes are already applied/deployed in Neon.

## Large image banks / flags workflow
1. In the site admin panel → **الأسئلة اليدوية**, choose multiple PNG/JPG/WebP files (up to 3MB each).
2. Click the multi-upload button. The backend uploads binaries to Object Storage (not PostgreSQL) and returns each stable `image_id`.
3. Download the generated CSV with `filename,image_id,reused` — used as the mapping when bulk importing flag or image questions.
4. Link each question to a previously uploaded image ID; for manual question creation use the new Image ID field.
5. When a player opens the question, the game API includes that UUID, and the browser loads the image from the public media service.
6. Re-uploading exactly the same bytes returns the existing image ID. Distinct crops/sizes are distinct images.

### Compatibility, limitations, and rollout
- **Existing category WebP artwork and home-page game covers remain on the current static paths**, to preserve the visuals while their eventual migration is planned. Those images have not yet been moved into Object Storage. Existing category **Neon UUID-linked SVG assets** continue to work, including the compatibility fallback in the new asset service.
- Currently no question has an image linked. The new feature is ready for the first flags batch, not automatically populated with stock imagery.
- Bulk *image* upload is ready; fully automated bulk **question import with image mapping** is not part of this bundle.
- Store only licensed or freely usable image assets. Public-read objects are publicly accessible (appropriate for game flags).
- The backend uses authenticated admin upload; storage credentials are injected into Neon Functions and do not appear in the frontend or repo.

## Verification
- Checked stored original schema and 14 legacy media records.
- Object Storage bucket present with public-read access.
- Both Neon Functions report **completed deployments**.
- Both server entrypoint scripts passed JavaScript syntax compilation checks.
- Front-end imports, image ID types, old game interaction paths, and six-file ZIP CRC32 passed source-level checks.
- **A real browser admin-upload, public-image GET and image-question end-to-end run have NOT yet been verified**. They should be performed after importing the ZIP into Figma Make; do not consider the frontend deployed until then.

## Backend source for maintenance
- `backend/assets/index.mjs`: new object storage media function source
- `backend/game/index.mjs`: minimally changed match function
- `backend/migrations/004_image_object_storage.sql`: idempotent schema migration already applied

No question answers, scoring rules, used-question histories, or player accounts were changed.
