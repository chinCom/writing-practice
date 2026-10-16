CREATE TABLE writing.transfer_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id text NOT NULL REFERENCES writing.curriculum_units(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  content_hash text NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  box integer NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  misses integer NOT NULL DEFAULT 0 CHECK (misses BETWEEN 0 AND 1),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit_id, item_id, content_hash)
);
CREATE TABLE writing.transfer_answers (
  user_id uuid NOT NULL,
  unit_id text NOT NULL,
  item_id text NOT NULL,
  content_hash text NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  answer text NOT NULL CHECK (length(answer) BETWEEN 1 AND 300),
  result jsonb NOT NULL,
  PRIMARY KEY (user_id, unit_id, item_id, content_hash, version),
  FOREIGN KEY (user_id, unit_id, item_id, content_hash) REFERENCES writing.transfer_progress(user_id, unit_id, item_id, content_hash) ON DELETE CASCADE
);
ALTER TABLE writing.transfer_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.transfer_answers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON writing.transfer_progress TO authenticated;
GRANT SELECT, INSERT ON writing.transfer_answers TO authenticated;
CREATE POLICY transfer_progress_owner ON writing.transfer_progress TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY transfer_answers_read ON writing.transfer_answers FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY transfer_answers_insert ON writing.transfer_answers FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
