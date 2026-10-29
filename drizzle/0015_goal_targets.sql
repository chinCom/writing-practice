-- A learner's goal gets a target: a CEFR level, or an IELTS practice score (not an official band).
-- Older profiles have no target; the app asks for one instead of guessing.
ALTER TABLE writing.profiles
  ADD COLUMN target_level text CHECK (target_level IN ('PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ADD COLUMN target_score numeric(2,1) CHECK (target_score IN (3, 3.5, 4, 4.5, 5)),
  ADD COLUMN target_date date;
