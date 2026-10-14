CREATE TABLE writing.preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_goal integer NOT NULL DEFAULT 5 CHECK (weekly_goal IN (3, 5, 7)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE writing.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_owner ON writing.preferences TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.preferences TO authenticated;
