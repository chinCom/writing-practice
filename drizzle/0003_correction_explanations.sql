CREATE TABLE writing.correction_explanations (
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  correction_index integer NOT NULL CHECK (correction_index BETWEEN 0 AND 11),
  prompt_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  json jsonb,
  mock boolean NOT NULL DEFAULT false,
  request_key uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, correction_index, prompt_version),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
CREATE TABLE writing.explanation_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX explanation_requests_user_created ON writing.explanation_requests(user_id, created_at);
ALTER TABLE writing.correction_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.explanation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY explanation_owner ON writing.correction_explanations TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY explanation_request_owner ON writing.explanation_requests TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.correction_explanations TO authenticated;
GRANT SELECT, INSERT ON writing.explanation_requests TO authenticated;
