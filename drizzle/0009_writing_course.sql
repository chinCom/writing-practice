-- Preserve existing task identifiers and owner policies while extending course limits.
ALTER TABLE writing.curriculum_units DROP CONSTRAINT curriculum_units_level_check;
ALTER TABLE writing.curriculum_units ADD CHECK (level IN ('PRE_A1','A1','A2','B1','B2','C1','C2'));
ALTER TABLE writing.placement_results DROP CONSTRAINT placement_results_chosen_level_check;
ALTER TABLE writing.placement_results ADD CHECK (chosen_level IN ('PRE_A1','A1','A2','B1','B2','C1','C2'));
ALTER TABLE writing.drafts DROP CONSTRAINT drafts_text_check;
ALTER TABLE writing.drafts ADD CHECK (length(text) <= 6500);
ALTER TABLE writing.submissions DROP CONSTRAINT submissions_text_check;
ALTER TABLE writing.submissions DROP CONSTRAINT submissions_word_count_check;
ALTER TABLE writing.submissions ADD CHECK (length(text) <= 6500);
ALTER TABLE writing.submissions ADD CHECK (word_count >= 5);
CREATE TABLE writing.practice_sources (
 submission_id uuid PRIMARY KEY REFERENCES writing.submissions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE writing.practice_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY practice_source_owner ON writing.practice_sources TO authenticated
 USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT ON writing.practice_sources TO authenticated;
CREATE INDEX practice_source_user ON writing.practice_sources(user_id);
