-- PROPOSED MIGRATION ONLY. NOT APPLIED TO THE LIVE NEON DATABASE.
-- Independent of public.app_matches, which belongs to Seen Jeem and has a
-- unique active-match-per-user index and category/points constraints.
-- Apply only after server code + migration testing in a temporary branch.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(8) NOT NULL UNIQUE,
  game_id varchar NOT NULL REFERENCES public.games(id),
  host_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  status varchar NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','active','finished','abandoned')),
  series_length smallint NOT NULL DEFAULT 1 CHECK (series_length IN (1,3,5)),
  revision bigint NOT NULL DEFAULT 0 CHECK(revision >= 0),
  -- Keep secrets (question answers, private API data) in host_state only.
  host_state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(host_state)='object'),
  display_state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(display_state)='object'),
  viewer_token_hash bytea,
  last_viewer_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  CONSTRAINT game_rooms_code_format CHECK (code ~ '^[A-Z0-9]{6,8}$')
);
CREATE INDEX IF NOT EXISTS game_rooms_host_latest ON public.game_rooms(host_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS game_rooms_active ON public.game_rooms(status,updated_at DESC);
-- One room per host per game; not one globally. Allows independent games.
CREATE UNIQUE INDEX IF NOT EXISTS game_rooms_one_active_game_per_host
 ON public.game_rooms(host_user_id,game_id) WHERE status IN ('waiting','active');

CREATE TABLE IF NOT EXISTS public.game_room_commands (
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  command_id uuid NOT NULL,
  revision bigint NOT NULL,
  command_type varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id,command_id),
  UNIQUE(room_id,revision)
);
CREATE INDEX IF NOT EXISTS game_room_commands_recent ON public.game_room_commands(room_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.letter_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leading_letter varchar(1) NOT NULL,
  question_text text NOT NULL,
  answer_text text NOT NULL,
  status varchar NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(length(btrim(question_text)) > 0),
  CHECK(length(btrim(answer_text)) > 0)
);
CREATE INDEX IF NOT EXISTS letter_questions_pick ON public.letter_questions(leading_letter,status,id);

CREATE TABLE IF NOT EXISTS public.letter_user_question_usage (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.letter_questions(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,question_id)
);
CREATE INDEX IF NOT EXISTS letter_user_question_recent ON public.letter_user_question_usage(user_id,first_seen_at DESC);
COMMIT;

-- Server requirements:
-- (1) authenticate host with existing app_sessions and verify room.host_user_id;
-- (2) viewer has a short-lived signed token and can read ONLY display_state;
-- (3) perform SELECT ... FOR UPDATE plus expected-revision compare and event commit
--     in one transaction; command_id ensures idempotent retries;
-- (4) choose room codes and viewer tokens with cryptographic randomness;
-- (5) never return host_state, token hash, or answer_text to the viewer;
-- (6) validate first answer letter against normalized Arabic letters;
-- (7) allocate unpublished/unused questions per user transactionally;
-- (8) implement viewer presence using last_viewer_seen_at heartbeat;
-- (9) enforce request limits, room expiry, CORS origin restrictions and access checks;
-- (10) do not enable Neon Realtime without evaluating configuration and permissions.