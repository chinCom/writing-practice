-- Expand the original single-task limits without changing existing writing or feedback.
ALTER TABLE writing.drafts DROP CONSTRAINT drafts_task_id_check;
ALTER TABLE writing.drafts DROP CONSTRAINT drafts_text_check;
ALTER TABLE writing.drafts ADD CHECK (task_id ~ '^[a-z0-9-]{1,80}$');
ALTER TABLE writing.drafts ADD CHECK (length(text) <= 2000);
ALTER TABLE writing.submissions DROP CONSTRAINT submissions_task_id_check;
ALTER TABLE writing.submissions DROP CONSTRAINT submissions_text_check;
ALTER TABLE writing.submissions DROP CONSTRAINT submissions_word_count_check;
ALTER TABLE writing.submissions ADD CHECK (task_id ~ '^[a-z0-9-]{1,80}$');
ALTER TABLE writing.submissions ADD CHECK (length(text) <= 2000);
ALTER TABLE writing.submissions ADD CHECK (word_count >= 20);
CREATE TABLE writing.curriculum_units (
  id text PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('A1','A2','B1')),
  sort_order integer NOT NULL CHECK (sort_order > 0),
  content jsonb NOT NULL,
  reviewed_by text NOT NULL CHECK (length(reviewed_by) > 0),
  reviewed_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  UNIQUE(level, sort_order)
);
ALTER TABLE writing.curriculum_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY curriculum_read ON writing.curriculum_units FOR SELECT TO authenticated USING (true);
GRANT SELECT ON writing.curriculum_units TO authenticated;

CREATE TABLE writing.placement_results (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','completed','failed')),
  result jsonb,
  chosen_level text CHECK (chosen_level IN ('A1','A2','B1')),
  calls_today integer NOT NULL DEFAULT 1 CHECK (calls_today BETWEEN 1 AND 3),
  call_day date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE writing.placement_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY placement_owner ON writing.placement_results TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.placement_results TO authenticated;

CREATE TABLE writing.lesson_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  warmups jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  PRIMARY KEY(user_id, lesson_id)
);
ALTER TABLE writing.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_owner ON writing.lesson_progress TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.lesson_progress TO authenticated;
