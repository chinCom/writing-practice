# Curriculum hotspot and boundary guard refactor

Date: 2026-10-18

Placement writes now live in [`db/placement`](../../src/lib/db/placement.ts), separate
from path reads, lesson access and exercises. The moved transaction implementations
were compared byte-for-byte before removal from the original module. Callers import
the new module directly. Locks, UTC quotas, statements and validation are unchanged.

[`lessonCompletion`](../../src/lib/lesson-completion.ts) calculates warm-up and writing
completion evidence independently of course traversal. The path builder retains level
ordering, independent IELTS module entry, parallel prompt selection, carried-target
advisory policy, unlock rules and public answer-key stripping.

The existing ESLint gate now forbids database imports from HTTP helpers, Next.js
adapters and provider adapters. It preserves the existing UI dependency restrictions.
Seven lint-fixture cases verify the guard and allowed domain/result contracts.

## Evidence

- Six new completion regressions cover separate prerequisites, safe writing,
  checkpoint scoring, unrelated evidence, dates and immutable history.
- Focused progression/access/architecture run: 35 passed.
- `npm run check`: 284 passed, 7 opt-in tests skipped.
- Thirty-two targeted desktop/mobile checks passed across `course`, `curriculum-tracks`,
  `curriculum-errors`, `lesson-submit`, `path-tabs`, and `today-next-task`.
- Integrated synthetic learner journey and production build passed.

The existing SQL regression traverses all 63 Core and 24 IELTS lessons. No content,
schema, prompt, score threshold or ownership policy changed. Hosted integrations and
AI quality remain outside this verification scope.
