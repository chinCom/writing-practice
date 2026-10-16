-- Shadow-mode recommendations are not pass provenance and never control unlocking.
-- NULL preserves legacy checks; no historical learner result is reclassified.
ALTER TABLE writing.submissions ADD COLUMN mastery_advisory jsonb
  CHECK (mastery_advisory IS NULL OR (
    jsonb_typeof(mastery_advisory) = 'object'
    AND mastery_advisory ?& ARRAY['outcome', 'carried']
    AND mastery_advisory->>'outcome' IN ('mastery', 'carry-forward', 'revise', 'unknown', 'blocked', 'checkpoint')
    AND jsonb_typeof(mastery_advisory->'carried') = 'array'
    AND jsonb_array_length(mastery_advisory->'carried') <= 2
  ));
