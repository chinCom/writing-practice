-- Evidence is append-only for learners and disappears with its owning submission.
CREATE TABLE writing.target_evidence (
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tag text NOT NULL CHECK (tag IN (
    'verb-tense', 'verb-form', 'subject-verb-agreement', 'modal-verbs',
    'passive-voice', 'conditionals', 'articles', 'determiners', 'pronouns',
    'plural-noun', 'countable-uncountable', 'prepositions', 'word-order',
    'missing-word', 'extra-word', 'comparatives-superlatives', 'relative-clauses',
    'question-formation', 'negation', 'gerund-infinitive', 'spelling',
    'capitalization', 'punctuation', 'apostrophe', 'run-on-sentence',
    'sentence-fragment', 'connectors'
  )),
  level text NOT NULL CHECK (level IN ('PRE_A1','A1','A2','B1','B2','C1','C2')),
  uses integer NOT NULL CHECK (uses BETWEEN 0 AND 100),
  errors integer NOT NULL CHECK (errors BETWEEN 0 AND uses),
  self_fixed integer CHECK (self_fixed BETWEEN 0 AND 100),
  is_first_attempt boolean NOT NULL,
  is_benchmark boolean NOT NULL DEFAULT false,
  grader_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, tag),
  FOREIGN KEY (submission_id, user_id) REFERENCES writing.submissions(id, user_id) ON DELETE CASCADE,
  CHECK (NOT is_first_attempt OR self_fixed IS NULL)
);
CREATE INDEX target_evidence_owner_created ON writing.target_evidence(user_id, created_at DESC);
ALTER TABLE writing.target_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY target_evidence_read ON writing.target_evidence FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY target_evidence_insert ON writing.target_evidence FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT ON writing.target_evidence TO authenticated;
REVOKE UPDATE, DELETE ON writing.target_evidence FROM authenticated;
