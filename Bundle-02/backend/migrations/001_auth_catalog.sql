-- Baleshhaa — Neon migration 001
-- Already applied to Neon project restless-tree-71310827, database baleshhaa.
-- Kept here for reproducibility. Do not paste admin passwords or DB credentials into Git.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS app_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username varchar(40) NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_.-]{3,40}$'),
 display_name varchar(100) NOT NULL CHECK(length(btrim(display_name))>=1),
 password_hash varchar(255) NOT NULL CHECK(length(password_hash)>40),
 role varchar(16) NOT NULL DEFAULT 'player' CHECK(role IN ('player','admin')),
 disabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 token_hash varchar(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
 key varchar(160) PRIMARY KEY,
 hits integer NOT NULL DEFAULT 1,
 window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS games (
 id varchar(40) PRIMARY KEY,
 title_ar varchar(120) NOT NULL,
 status varchar(18) NOT NULL CHECK(status IN ('active','coming_soon','hidden')),
 sort_order integer NOT NULL
);
INSERT INTO games(id,title_ar,status,sort_order) VALUES
 ('seen-jeem','سين جيم','active',1),
 ('letters','لعب الحروف','coming_soon',2),
 ('codenames','كود نيمز','coming_soon',3),
 ('thirty','تحدي الثلاثين','coming_soon',4)
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS schema_migrations (
 version varchar(40) PRIMARY KEY,
 applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES('001_auth_catalog') ON CONFLICT DO NOTHING;
