# Practice session refactor

Date: 2026-10-18

[`usePracticeSession`](../../src/components/practice/usePracticeSession.ts) now owns
queue loading, answer/version snapshots, duplicate-submit protection, pending-answer
retry, result state and batch refresh. The [Practice view](../../src/components/practice/Practice.tsx)
retains layout, localized hints, rendering and focus-preserving animation refs.

Endpoints, ten-second deadlines, abort behavior, immutable retry payloads, result
messages, completion rules, explicit conflict refresh and keyboard focus are unchanged.
No new state library or generic data-fetching layer was introduced.

## Evidence

- `npm run check`: 284 passed, 7 opt-in tests skipped.
- Twenty-six existing/new targeted desktop/mobile checks passed in the initial run.
  One new fixture failed on both devices because it assumed exactly one initial GET;
  development Strict Mode may perform two reads. The fixture now compares against the
  hydrated baseline and uses a version independent of mount-read count.
- All four cases in the corrected `practice-session` spec passed, including an explicit
  duplicate form submission during a delayed save and stale-queue reload on demand.
- Existing Practice checks verify unchanged lost-request retry, answer hints, batches,
  keyboard input and reduced-motion behavior.
- The integrated synthetic learner journey and production build passed after the fix.

The correction changed only the test fixture, not the application behavior or deadlines.
Browser APIs are synthetic; the integrated journey uses local fixtures. Hosted services
and live AI quality were not reverified.
