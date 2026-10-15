ALTER TABLE writing.submissions ADD COLUMN revision_kind text
  CHECK (revision_kind IN ('self', 'assisted'));

CREATE TABLE writing.target_assistance (
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  correction_index integer NOT NULL CHECK (correction_index BETWEEN 0 AND 11),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, correction_index),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE
);
ALTER TABLE writing.target_assistance ENABLE ROW LEVEL SECURITY;
CREATE POLICY target_assistance_read ON writing.target_assistance FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY target_assistance_insert ON writing.target_assistance FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT ON writing.target_assistance TO authenticated;
CREATE INDEX target_assistance_owner ON writing.target_assistance(user_id);
-- Existing Apply choices already exposed the target answer. Keep that history.
INSERT INTO writing.target_assistance(submission_id,user_id,correction_index)
SELECT c.submission_id,c.user_id,c.correction_index FROM writing.correction_choices c
JOIN writing.feedback f ON f.submission_id=c.submission_id
WHERE c.status='applied' AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(coalesce(f.json->'target_report','[]'::jsonb)) report,
  jsonb_array_elements_text(report->'correction_indexes') idx
  WHERE idx::integer=c.correction_index
);
