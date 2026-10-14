# Saved writing Practice

## Delivered behavior

- `/practice` requires sign-in. Anonymous learners go to `/login`.
- Practice builds exercises from saved feedback with confident, located corrections.
- Style-only corrections and crisis feedback do not become exercises.
- The learner sees the original sentence and types the corrected phrase.
- The server checks the answer against the saved suggestion. No AI call is needed.
- Case, surrounding whitespace, and repeated whitespace do not change the result.
- A wrong answer allows one retry. The learner then sees the saved suggestion and explanation.
- Correct first attempts advance the review box. A missed first attempt returns the drill to box 1.
- Review intervals are 1, 3, 7, 14, and 30 days. The due queue resumes after a reload.
- A lost answer response keeps the same answer and version for safe retry. A changed replay returns a conflict.
- English and Vietnamese interfaces preserve English writing and correction-off input attributes.

## Data and access

`drizzle/0004_practice.sql` adds `writing.practice_drills` and `writing.practice_answers`.
Both hosted tables have owner policies for the authenticated role and enabled row-level security.
The migration applied successfully. A second run made no change.

`GET /api/practice` returns at most 20 due questions without model answers.
`POST /api/practice` accepts only a drill UUID, answer, and version.
The server verifies the session and request origin. Responses use private, no-store caching.
Foreign drills cannot be answered. Versioned saved results prevent a repeated request from advancing the review twice.

## Verification

- `npm run check`: formatting, typecheck, lint, design rules, and 50 tests passed. Two paid live tests were skipped.
- Full unconfigured browser suite: 80 passed and six intentional skips.
- `npm run build`: passed.
- `npm audit --omit=dev`: zero vulnerabilities.
- PGlite PostgreSQL tests verify question seeding, no answer leakage, owner isolation, retries, replay conflicts, due scheduling, and later review.
- Desktop and mobile browser tests verify answer entry, Enter-key submission, completion, reload, lost-response retry, and anonymous access.
- `node scripts/audit-practice.mjs`: six scans, zero accessibility violations. Three initial-question scans have one inconclusive highlighted-text contrast check.

Screenshots are under `docs/verification/ux/screenshots/practice-*-question.png` and `practice-*-result.png`.
The accessibility artifact is `docs/verification/ux/practice-accessibility.json`.

## Repeat the browser checks

Stop the configured development server, then run:

```sh
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' GOOGLE_AUTH_ENABLED=false npm run test:e2e -- --workers=2
```

Restart the normal development server to inspect previews and run the accessibility script.
Preview APIs use labeled sample data and return 404 in production.

## Limits and deferred work

- The browser tests use synthetic API responses. A signed-in hosted Practice browser workflow remains untested.
- Hosted verification covers the migration and access-policy metadata, not a new real learner's review session.
- Answer checking accepts the saved phrase only. Other valid alternatives can be rejected.
- Practice uses existing model corrections. It does not independently establish correction quality.
- Seeding occurs when Practice loads. Nightly AI generation and varied drill formats are not implemented.
- Review boxes are per correction. Per-tag mastery, XP, streaks, and Progress remain deferred.
- This slice is not committed, pushed, or deployed.
