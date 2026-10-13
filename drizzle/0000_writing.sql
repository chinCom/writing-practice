-- Private schema: do not add "writing" to the Supabase Data API exposed schemas.
CREATE SCHEMA writing;
GRANT USAGE ON SCHEMA writing TO authenticated;

CREATE TABLE writing.drafts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text NOT NULL CHECK (task_id = 'weekend'),
  text text NOT NULL CHECK (length(text) <= 1200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);
CREATE TABLE writing.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text NOT NULL CHECK (task_id = 'weekend'),
  text text NOT NULL CHECK (length(text) <= 1200),
  word_count integer NOT NULL CHECK (word_count >= 40),
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 20),
  parent_submission_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (parent_submission_id, user_id) REFERENCES writing.submissions(id, user_id),
  CHECK ((attempt = 1 AND parent_submission_id IS NULL) OR (attempt > 1 AND parent_submission_id IS NOT NULL))
);
CREATE INDEX submissions_user_created ON writing.submissions(user_id, created_at DESC);
CREATE TABLE writing.feedback (
  submission_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  json jsonb NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
CREATE TABLE writing.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL,
  cache_hit_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL,
  latency_ms integer NOT NULL,
  mock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);

ALTER TABLE writing.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY drafts_owner ON writing.drafts TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY submissions_owner ON writing.submissions TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY feedback_owner ON writing.feedback TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY usage_owner ON writing.ai_usage TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA writing TO authenticated;
REVOKE ALL ON SCHEMA writing FROM PUBLIC, anon;
