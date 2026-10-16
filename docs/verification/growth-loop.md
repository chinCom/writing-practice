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

## M2 — self-revision

- Target answers, explanations, accessible labels, nearby previews, next-step answer hints, and rewrite stay hidden before revision or explicit “Show me”. Legacy and non-target corrections keep Apply.
- Apply and Explain endpoints reject hidden target answers. Show me saves owner-only, immutable assistance history. Undo does not erase history. Revision reservations derive `revision_kind` from that history and inherit assistance from their parent.
- Migration `0011_self_revision.sql` is additive and local only. Existing applied target choices seed assistance history. Old revisions keep unknown provenance (`NULL`).
- Same-grader revisions report targets as avoided when uses fall below half the first attempt. They do not claim these targets were fixed.
- Progress labels revision score changes “How much you fixed” and distinguishes revision practice from new-writing growth.
- `npm run check`: 139 passed, 7 skipped. Full Playwright: 274 passed, 10 skipped. Production build passed. Desktop/mobile screenshots: `ux/screenshots/growth-self-revision-{desktop,mobile}.png`.
- The first full check found an outdated page mock and the previously observed recovery-deadline timing flake. Updated the mock; the full rerun passed.
- Author self-review only. No hosted sign-in, migration, paid model calls, or deployment. The UI hides answers; this is not a secrecy boundary against inspecting response data. Assistance provenance records app actions, not whether someone copied from another source.

### M2 review fix — Practice answer leak

Practice now applies the same availability rule to its due queue, next-review date, and answer submission.
A first-attempt target drill stays unavailable until its source has a completed revision.
Show me, unrelated completed checks, and pending or failed revisions do not unlock Practice.
The rule covers already-seeded drills and legacy backfill. Non-target and revision drills remain available.
Hidden drills reject direct answers and saved-answer replays before exposing explanations or hints.

Regression tests first reproduced the leak in real PGlite, then passed with the shared query rule.
`npm run check` passed: 144 tests, 7 skipped; formatting, types, lint, and design checks passed.
`npm run build` passed. Author self-review checked all three query boundaries and owner isolation.
No migration or UI change is needed. This is synthetic local evidence, not hosted verification.

## M3 — evaluation tooling, study blocked

The existing evaluator and opt-in harness now accept a human-annotated corpus and perform three runs per text.
They record target precision, run instability, human pass disagreement, and within-text score/rate standard deviations.
Incomplete outputs, absent reports, mixed versions, inadequate coverage, and missing second-review metadata cannot pass.
Synthetic unit tests cover the calculations; fixture reviewer labels do not constitute a real study.

**Not completed:** The owner reported a private 60-text Cambridge draft outside the repository: 6 A1, 24 A2, and 30 B1 texts.
The owner confirmed consent and approved paid provider calls. No paid call was made.
The draft still lacks human uses counts, task scores, and annotator codes; the 25% independent review also remains required.
Do not substitute AI annotations for the human gate. The planned spreadsheet/finalization tools are owner-side work.
The annotated corpus, pinned model identifier, and Cambridge permission email date remain pending.
M3 is not passed. M4 enforcement and dependent milestones remain blocked by this study.
A1 coverage is thin; Cambridge prompts also make lesson pass disagreement an approximation, not direct app-task validation.
Content publication for M6–M9 still requires product-owner review. D5 pilot recruitment and dates remain undecided.
See [the existing harness instructions](../../evals/README.md#growth-loop-target-study-m3) for the next action.

Verification: `npm run check` passed (143 tests, 7 skipped; formatting, types, lint, design checks passed).
`npm run build` passed. The target-study command without `EVAL_LIVE=true` failed before loading credentials or making calls, as required.
M3 changes do not alter UI; M1–M2 full browser verification remains 274 passed, 10 skipped.
Author self-review found no remaining blocker in this slice. Manual reviewer validation remains mandatory.

### Handoff

- Goal: continue the transfer-focused growth loop on branch `feat/growth-loop`.
- Location: `/home/very_dumb_code/Projects/writing-practice-growth-loop`.
- Next action: finish human annotations and independent review, validate the private corpus, supply a pinned model identifier, then run the approved three-run study.
- Record only summary numbers and the Cambridge permission email date here. Keep essays, reviewer identities, and model outputs private.
- Keep M4 enforcement disabled until reviewed precision and calibration evidence pass. Do not apply local migrations to hosted data without release approval.
