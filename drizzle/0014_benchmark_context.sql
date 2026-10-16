-- Freeze reviewed prompt identity at reservation; legacy checks remain unmatched.
ALTER TABLE writing.submissions ADD COLUMN benchmark_context jsonb;
ALTER TABLE writing.submissions ADD CONSTRAINT benchmark_context_shape CHECK (
  benchmark_context IS NULL OR (
    jsonb_typeof(benchmark_context) = 'object' AND
    benchmark_context ?& ARRAY['unitId','contentHash','role','minWords','maxWords'] AND
    benchmark_context->>'role' IN ('baseline','checkpoint') AND
    length(benchmark_context->>'unitId') BETWEEN 1 AND 80 AND
    length(benchmark_context->>'contentHash') BETWEEN 1 AND 128 AND
    (benchmark_context->>'minWords')::integer BETWEEN 5 AND 500 AND
    (benchmark_context->>'maxWords')::integer BETWEEN (benchmark_context->>'minWords')::integer AND 500
  )
);
