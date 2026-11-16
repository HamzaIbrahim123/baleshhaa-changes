-- Migration 003 already applied to Neon baleshhaa. This is the reproducible source.
-- New tables/indexes preserve all existing accounts and questions.
CREATE TABLE IF NOT EXISTS app_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 category_ids uuid[] NOT NULL,
 team_names jsonb NOT NULL DEFAULT '["الفريق الأول","الفريق الثاني"]'::jsonb,
 team_helps jsonb NOT NULL DEFAULT '[[],[]]'::jsonb,
 status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','abandoned')),
 test_mode boolean NOT NULL DEFAULT false,
 final_scores jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (array_length(category_ids,1) BETWEEN 2 AND 8)
);
CREATE UNIQUE INDEX IF NOT EXISTS app_matches_one_active_per_user ON app_matches(user_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS app_matches_user_recent_idx ON app_matches(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS app_user_question_usage (
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 question_id uuid NOT NULL REFERENCES app_questions(id) ON DELETE CASCADE,
 match_id uuid REFERENCES app_matches(id) ON DELETE SET NULL,
 opened_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,question_id)
);
CREATE INDEX IF NOT EXISTS app_usage_user_time ON app_user_question_usage(user_id,opened_at DESC);
CREATE TABLE IF NOT EXISTS app_match_questions (
 match_id uuid NOT NULL REFERENCES app_matches(id) ON DELETE CASCADE,
 cell_id varchar(100) NOT NULL,
 question_id uuid NOT NULL REFERENCES app_questions(id),
 opened_at timestamptz NOT NULL DEFAULT now(),revealed_at timestamptz,
 PRIMARY KEY(match_id,cell_id),UNIQUE(match_id,question_id)
);
CREATE INDEX IF NOT EXISTS app_match_questions_match_idx ON app_match_questions(match_id,opened_at);
CREATE OR REPLACE FUNCTION public.app_open_match_question(p_user uuid, p_match uuid, p_cell character varying, p_cat uuid, p_points integer)
 RETURNS TABLE(question_id uuid, question_text text, category_id uuid, points smallint)
 LANGUAGE plpgsql
AS $function$
DECLARE v_match app_matches%ROWTYPE;v_question uuid;v_previous uuid;v_count integer;
BEGIN
 SELECT * INTO v_match FROM app_matches WHERE id=p_match AND user_id=p_user AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MATCH_NOT_ACTIVE' USING ERRCODE='P0001'; END IF;
 IF NOT p_cat=ANY(v_match.category_ids) OR p_points NOT IN (200,400,600)
 OR p_cell NOT IN (p_cat::text||':A:'||p_points,p_cat::text||':B:'||p_points)
 THEN RAISE EXCEPTION 'INVALID_CELL' USING ERRCODE='P0001'; END IF;
 SELECT mq.question_id INTO v_previous FROM app_match_questions mq WHERE mq.match_id=p_match AND mq.cell_id=p_cell;
 IF v_previous IS NOT NULL THEN
 RETURN QUERY SELECT q.id,q.question_text,q.category_id,q.points FROM app_questions q WHERE q.id=v_previous;RETURN;
 END IF;
 SELECT count(*) INTO v_count FROM app_match_questions mq JOIN app_questions q ON q.id=mq.question_id
 WHERE mq.match_id=p_match AND q.category_id=p_cat AND q.points=p_points;
 IF v_count>=2 THEN RAISE EXCEPTION 'LEVEL_ALREADY_COMPLETE' USING ERRCODE='P0001'; END IF;
 SELECT q.id INTO v_question FROM app_questions q
 WHERE q.category_id=p_cat AND q.points=p_points AND q.status='published'
 AND NOT EXISTS(SELECT 1 FROM app_user_question_usage u WHERE u.user_id=p_user AND u.question_id=q.id)
 ORDER BY random() LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF v_question IS NULL THEN RAISE EXCEPTION 'NO_UNUSED_QUESTIONS' USING ERRCODE='P0001'; END IF;
 INSERT INTO app_user_question_usage(user_id,question_id,match_id) VALUES(p_user,v_question,p_match);
 INSERT INTO app_match_questions(match_id,cell_id,question_id) VALUES(p_match,p_cell,v_question);
 RETURN QUERY SELECT q.id,q.question_text,q.category_id,q.points FROM app_questions q WHERE q.id=v_question;
END $function$

INSERT INTO schema_migrations(version) VALUES ('003_matches_per_user_usage') ON CONFLICT DO NOTHING;
