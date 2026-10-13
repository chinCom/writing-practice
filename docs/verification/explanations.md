# Correction explanations

## Delivered behavior

Each active correction has an **Explain** button. The result has two sections:

- **Why the original needs a change** explains the relevant rule in the writing context.
- **Why the suggestion fits** explains the suggested wording without changing the learner's meaning.

Desktop shows the result inside the active correction card. Mobile shows the result in the correction sheet. The result area scrolls internally when needed. The original writing does not move. Loading, timeout, session, limit, and retry states have translated interface text.

The prompt uses an ASD-STE100-inspired style. It asks for short, direct sentences and plain A2 English. This is not certified ASD-STE100 compliance. The prompt distinguishes actual errors from optional improvements. It also tells the coach to identify questionable suggestions instead of inventing a rule.

## Security and cost controls

The server accepts only a submission ID and correction index. It loads the original text and correction from owner-only saved feedback. Client-supplied wording, unknown fields, foreign submissions, and safety-flagged feedback cannot enter an explanation request.

The AI request contains writing and correction context. It does not contain account identifiers or credentials. The server validates the JSON result. Text renders through React without raw HTML.

The provider uses non-thinking JSON output, a 600-token maximum, and a shared 15-second deadline. Invalid output can trigger one validation retry. Transport failures do not trigger automatic paid retries.

The database saves explanations by submission, correction index, and prompt version. Completed explanations are reused without another provider call. A per-owner transaction lock prevents duplicate generation while a request is active. Failed requests can be retried explicitly. Accounts have 60 new explanation attempts per UTC day. Failed attempts count; cached results remain available after the limit.

`drizzle/0003_correction_explanations.sql` was applied to the configured hosted database. Both new tables have row-level security and authenticated owner policies. No existing learner writing was deleted.

## Verification

- `npm run check`: formatting, typecheck, lint, and design checks passed; 47 tests passed and two opt-in live tests skipped.
- Browser suite: 72 passed and six intentional skips. Public Supabase variables and `DATABASE_URL` were empty; Google was disabled.
- `RUN_LIVE_EXPLANATION=true npx vitest run tests/live-explanation.test.ts`: passed with three paid calls using synthetic writing.
- Production build passed. Production dependency audit found zero vulnerabilities.
- Desktop 1440×1000 and mobile 390×844 screenshots were inspected.
- Two automated accessibility scans reported zero WCAG A/AA violations. Contrast and modal focus checks remain inconclusive in the automated results.

The live samples covered tense, a missing word, and an optional wording improvement. Provider latency was 1.01–1.35 seconds. The optional-change result said the original phrase was not wrong. Each sample passed the schema, field-length, and 20-word sentence checks. These samples are useful evidence, not a broad quality benchmark or latency guarantee.

Local PostgreSQL tests cover saved-source loading, owner isolation, strict input, caching, pending claims, explicit retry, and daily limits. Browser tests cover correction-specific results, loading, retry, stable writing position, and unique correction-detail IDs. The accessibility check exposed a hidden duplicate card; the regression failed before the duplicate was removed.

## Evidence and limits

- Live synthetic results: `ux/explanation-live.json`.
- Accessibility findings: `ux/explanation-accessibility.json`.
- Screenshots: `ux/screenshots/explain-desktop.png` and `ux/screenshots/explain-mobile.png`.

Browser API responses are synthetic. The provider test calls DeepSeek directly. Hosted verification checked the migration and owner-policy metadata, not a new signed-in browser explanation. Explanations are currently English only. AI output can still be incorrect. Database network duration and production-wide abuse prevention remain outside this slice.

This slice is implemented locally and its database migration is applied. The code is included in the current implementation commit; it is not pushed or deployed.
