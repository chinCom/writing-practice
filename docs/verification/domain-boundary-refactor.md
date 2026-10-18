# Domain and persistence boundary refactor

Date: 2026-10-17 (verification); recorded on 2026-10-18.

Database curriculum, transfer and correction operations now raise transport-independent
[`DomainError`](../../src/lib/domain-error.ts) reasons rather than importing HTTP
helpers. [`apiFailure`](../../src/lib/api.ts) maps these reasons to their unchanged
HTTP statuses, bodies and privacy headers. Lesson and writing pages map the existing
not-found/locked/warm-ups-required reasons to their unchanged navigation destinations.
Known task-access reasons remain visible in privacy-safe feedback failure logs.

[`AiResult`](../../src/lib/ai-result.ts) gives feedback and explanation persistence
explicit data/metadata contracts instead of deriving contracts from provider functions.
Existing transaction types replace nested inferred aliases. SQL, transaction boundaries,
provider calls, quotas, ownership policies and user-visible behavior are unchanged.
Legacy string errors in other operations remain unchanged where their callers already
translate them; this slice does not broaden the public error surface.

## Evidence at slice completion

- Focused checks: 92 tests passed.
- `npm run check`: 250 passed, 7 opt-in tests skipped.
- New regressions cover all nine domain reason/status mappings and ten page access cases.
- Twenty targeted desktop/mobile browser checks passed:
  `curriculum-errors`, `lesson-submit`, `transfer`, and `feedback-self-revision`.
- `npm run test:journey`: one synthetic integrated journey passed.
- `npm run build`: passed.

No live provider calls, hosted database mutations, or schema migrations were performed.
Browser APIs and the integrated journey use synthetic/local fixtures. Hosted sign-in,
provider quality, and production readiness remain separately gated.
