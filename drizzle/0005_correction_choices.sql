CREATE TABLE writing.correction_choices (
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  correction_index integer NOT NULL CHECK (correction_index BETWEEN 0 AND 11),
  status text NOT NULL CHECK (status IN ('open', 'applied', 'dismissed')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, correction_index),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
CREATE TABLE writing.correction_reports (
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  correction_index integer NOT NULL CHECK (correction_index BETWEEN 0 AND 11),
  reason text NOT NULL CHECK (reason IN ('incorrect', 'meaning', 'unclear', 'other')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, correction_index),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
ALTER TABLE writing.correction_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing.correction_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY correction_choice_owner ON writing.correction_choices TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY correction_report_owner ON writing.correction_reports TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE ON writing.correction_choices, writing.correction_reports TO authenticated;
CREATE INDEX correction_choices_owner ON writing.correction_choices(user_id);
CREATE INDEX correction_reports_owner ON writing.correction_reports(user_id);
