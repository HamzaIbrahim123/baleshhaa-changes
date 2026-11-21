-- Bundle 35: additive letter-question metadata only. No Seen Jeem tables changed.
-- Compatible with existing letter_questions, safe to rerun.
BEGIN;
ALTER TABLE public.letter_questions
  ADD COLUMN IF NOT EXISTS category varchar(60) NOT NULL DEFAULT 'ثقافة عامة';
ALTER TABLE public.letter_questions
  ADD COLUMN IF NOT EXISTS difficulty smallint NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS letter_questions_unique_text
  ON public.letter_questions (leading_letter, md5(question_text));
CREATE INDEX IF NOT EXISTS letter_questions_category_level
  ON public.letter_questions (leading_letter, status, difficulty, category);
COMMIT;
