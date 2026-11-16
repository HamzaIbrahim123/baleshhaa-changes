-- Bundle 03: additive admin-managed content schema, keeps real accounts and sessions untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS app_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
 mime_type varchar(20) NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/webp')),
 byte_count integer NOT NULL CHECK(byte_count BETWEEN 1 AND 1048576),
 image_data bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE games ADD COLUMN IF NOT EXISTS description_ar text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS image_id uuid REFERENCES app_media(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS app_sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 game_id varchar(40) NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
 title_ar varchar(120) NOT NULL CHECK(length(btrim(title_ar))>0),
 description_ar text,
 image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
 status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden')),
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sections_game_idx ON app_sections(game_id,status,sort_order);
CREATE TABLE IF NOT EXISTS app_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 section_id uuid NOT NULL REFERENCES app_sections(id) ON DELETE RESTRICT,
 title_ar varchar(120) NOT NULL CHECK(length(btrim(title_ar))>0),
 description_ar text,
 image_id uuid NOT NULL REFERENCES app_media(id) ON DELETE RESTRICT,
 status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden')),
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_categories_section_idx ON app_categories(section_id,status,sort_order);
CREATE TABLE IF NOT EXISTS app_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category_id uuid NOT NULL REFERENCES app_categories(id) ON DELETE RESTRICT,
 question_text text NOT NULL CHECK(length(btrim(question_text))>0),
 answer_text text NOT NULL CHECK(length(btrim(answer_text))>0),
 points smallint NOT NULL CHECK(points IN (200,400,600)),
 status varchar(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
 source_reference text,
 created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_questions_category_idx ON app_questions(category_id,status,points);
INSERT INTO schema_migrations(version) VALUES ('002_admin_content') ON CONFLICT(version) DO NOTHING;
COMMIT;
