ALTER TABLE writing.submissions ADD COLUMN request_key uuid;
ALTER TABLE writing.submissions ADD COLUMN started_at timestamptz;
CREATE UNIQUE INDEX submissions_owner_request_key
  ON writing.submissions(user_id, request_key) WHERE request_key IS NOT NULL;
