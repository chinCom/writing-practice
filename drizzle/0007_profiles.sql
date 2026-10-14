CREATE TABLE writing.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  native_language text NOT NULL CHECK (native_language IN ('en', 'vi', 'other')),
  goal text NOT NULL CHECK (goal IN ('general', 'work', 'ielts', 'toefl')),
  starting_level text NOT NULL CHECK (starting_level IN ('PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  daily_minutes integer NOT NULL CHECK (daily_minutes IN (5, 15, 30)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE writing.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner ON writing.profiles TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.profiles TO authenticated;
