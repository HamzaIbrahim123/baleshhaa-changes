-- Bundle 18: upgrade media assets to Neon Object Storage without losing legacy content.
-- Already applied to the live baleshhaa database on 2026-11-18.
-- All 14 legacy SVG media rows and 990 text-only questions remain unchanged.
BEGIN;
ALTER TABLE public.app_media ADD COLUMN IF NOT EXISTS storage_bucket text;
ALTER TABLE public.app_media ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE public.app_media ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE public.app_media ALTER COLUMN image_data DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_media_storage_key_unique
 ON public.app_media(storage_bucket,storage_key) WHERE storage_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_media_storage_sha_unique
 ON public.app_media(sha256) WHERE storage_key IS NOT NULL;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
  WHERE conname='app_media_has_content_ck' AND conrelid='public.app_media'::regclass)
 THEN
  ALTER TABLE public.app_media ADD CONSTRAINT app_media_has_content_ck
  CHECK (image_data IS NOT NULL OR (storage_bucket IS NOT NULL AND storage_key IS NOT NULL));
 END IF;
END $$;
COMMIT;
