# Growth loop verification

## M1 — focused check

Implemented locally on `feat/growth-loop`. The [design](../superpowers/specs/2026-10-15-growth-loop-design.md) defines the gates.

- Trusted Core unit targets reach the grader separately from learner text. Standalone and IELTS checks stay target-free.
- Optional target reports survive only complete, internally consistent validation. Correction location remaps indexes or drops the report.
- Migration `0010_target_evidence.sql` adds immutable owner-only evidence with a composite owner foreign key and cascading deletion.
- Completed checks save feedback, evidence, Practice items, and usage atomically. Retries do not duplicate evidence.
- Feedback shows target counts before strengths. Unused targets do not appear perfect. Old feedback and safety feedback remain usable.
- The existing pass rule remains unchanged. Evidence is not yet benchmark evidence.

### Local checks

- `npm run check`: 138 passed, 7 skipped; formatting, types, lint, and design checks passed.
- `npx playwright test -c .superpowers/playwright.worktree.ts`: 268 passed, 10 skipped. Isolated unconfigured server on port 3002.
- `npm run build`: passed.
- Database tests use real PGlite with synthetic provider responses. They verify report persistence, retry behavior, safety suppression, owner separation, immutable rows, foreign-owner rejection, and cascading deletion.
- Browser tests cover English and Vietnamese, desktop and mobile, dark mode, absent reports, and safety suppression.
- Inspected screenshots: `ux/screenshots/growth-targets-{desktop,mobile}.png`.
- Author self-review only: project instructions prohibit subagents.

### Limits and gates

No hosted migration, live model call, push, or deployment occurred. Synthetic tests do not establish target-error precision or grader noise. The 40-text human-annotated study, 25% second review, and 30-text noise calibration remain pending. Native-speaker review of Vietnamese strings remains pending. M4 enforcement and reviewed content remain gated.
