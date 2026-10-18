# Submission orchestration refactor

Date: 2026-10-17

## Boundary

[`checkSubmission`](../../src/lib/feedback/check-submission.ts) now owns the submission
lifecycle: reserve, inspect an existing request, claim, grade, validate/locate feedback,
complete, and clean up a failed owned claim. It returns typed pending/completed data
and operation errors, not HTTP responses. The caller supplies the verified owner and
validated input for an accessible task.

The [feedback route](../../src/app/api/feedback/route.ts) retains authentication,
bounded JSON reading, task access/input validation, request-key validation or creation,
HTTP headers/statuses, private error responses, and privacy-safe failure logging.

## Preserved contracts

- The coach configuration check remains before reservation, including replay requests.
- Reservation and claim calls retain the same ordering and transaction boundaries.
- Provider work remains outside the database transactions.
- Completed replays do not call the provider and do not add a `mock` response field.
- Failed replays do not acquire or clean up a claim.
- A lost claim returns 202 with `Retry-After: 3`; it does not grade or fail the submission.
- A claimed operation failure attempts cleanup once. Cleanup failure does not replace
  the original failure, and no automatic provider retry was added.
- Quota, conflict, invalid-parent, coach, database-timeout, and authentication responses
  retain their existing codes, statuses, messages, and private/no-store headers.
- Status lookup does not reserve or grade writing.
- Target validation, correction location, growth gating, usage persistence, deadlines,
  and the 90-second route duration are unchanged.

No schema, ownership policy, prompt, quota, progression, layout, or dependency changes
were made in this slice.

## Evidence

- New lifecycle and HTTP-contract regressions: 31 passed.
- Focused new/existing operation, database, recovery, and API-failure tests: 71 passed.
- `npm run check`: passed, 231 tests passed and 7 opt-in tests skipped.
- Targeted desktop/mobile browser checks: 44 passed.
- `npm run test:journey`: one integrated synthetic learner journey passed.
- `npm run build`: passed.

```sh
npx vitest run tests/submission-check.test.ts tests/database.test.ts tests/coach-request.test.ts tests/api-failure.test.ts
npx playwright test tests/e2e/writing-check.spec.ts tests/e2e/ux-interactions.spec.ts tests/e2e/release-blockers.spec.ts --project=desktop --project=mobile --workers=2
npx playwright test tests/e2e/ux.spec.ts --project=desktop --project=mobile --workers=2 --grep 'failed save|expired session|a failed recovered|invalid coach output|daily quota'
```

These results describe this slice at completion; later slices have their own evidence.
Browser APIs are synthetic and the integrated journey uses local auth, SQL, and grading
fixtures. Hosted integrations and live AI quality were not reverified. No paid-provider
checks or database migrations were run.
