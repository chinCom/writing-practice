CREATE TABLE writing.practice_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  correction_index integer NOT NULL CHECK (correction_index BETWEEN 0 AND 11),
  payload jsonb NOT NULL,
  box integer NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  misses integer NOT NULL DEFAULT 0 CHECK (misses BETWEEN 0 AND 1),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (submission_id, correction_index),
  UNIQUE (id, user_id),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
CREATE TABLE writing.practice_answers (
  drill_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  answer text NOT NULL CHECK (length(answer) <= 300),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (drill_id, version),
  FOREIGN KEY (drill_id, user_id) REFERENCES writing.practice_drills(id, user_id) ON DELETE CASCADE
);
CREATE INDEX practice_due_owner ON writing.practice_drills(user_id, next_review_at);
ALTER TABLE writing.practice_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.practice_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY practice_drill_owner ON writing.practice_drills TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY practice_answer_owner ON writing.practice_answers TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.practice_drills TO authenticated;
GRANT SELECT, INSERT ON writing.practice_answers TO authenticated;
