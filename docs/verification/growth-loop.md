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
The owner confirmed consent and approved paid provider calls. The separate AI diagnostic below has now run; the human study has not.
The draft still lacks human uses counts, task scores, and annotator codes; the 25% independent review also remains required.
Do not substitute AI annotations for the human gate. The planned spreadsheet/finalization tools are owner-side work.
The human-annotated corpus and Cambridge permission email date remain pending. The diagnostic explicitly selected `deepseek-flash`, a provider alias.
M3 is not passed. M4 enforcement and dependent milestones remain blocked by this study.
A1 coverage is thin; Cambridge prompts also make lesson pass disagreement an approximation, not direct app-task validation.
Content publication for M6–M9 still requires product-owner review. D5 pilot recruitment and dates remain undecided.
See [the existing harness instructions](../../evals/README.md#growth-loop-target-study-m3) for the next action.

Verification: `npm run check` passed (143 tests, 7 skipped; formatting, types, lint, design checks passed).
`npm run build` passed. The target-study command without `EVAL_LIVE=true` failed before loading credentials or making calls, as required.
M3 changes do not alter UI; M1–M2 full browser verification remains 274 passed, 10 skipped.
Author self-review found no remaining blocker in this slice. Manual reviewer validation remains mandatory.

### Provisional AI diagnostic

The approved diagnostic ran all 60 private texts three times with `deepseek-flash:feedback-targets-3`.
Its reference uses AI-reviewed correction proposals, estimated uses, and provisional task scores. It is not human gold.
The runner preserves that provenance, checkpoints private outputs, and cannot pass M3 or noise eligibility.

| Measure | Result |
| --- | --- |
| Calls recorded | 180 |
| Failed grading calls | 15 |
| Successful calls without a target report | 93 |
| Usable target reports after location/validation | 58 |
| Exact-match target correction matches | 19 |
| Unmatched target correction claims | 119 |
| Precision against provisional reference | 13.8% |
| Pass disagreement with provisional reference | 36.2% |
| Human pass disagreement | Unknown |
| Human study / noise eligibility | Both false |

Precision is 19 / (19 + 119), on usable reports only. Missing reports make the sample highly selective.
The matcher accepts unchanged context around a minimal edit; alternative valid fixes or taxonomy disagreements can still appear unmatched.
Sample inspection found both model over-editing and reference/matching limits. These numbers do not establish human-verified accuracy.
Only eight texts had three raw target reports, far below the 30-text calibration requirement.
The partial noise figures are not accepted calibration and must not support learner growth claims.
Recorded successful-call usage was 229,531 prompt tokens and 173,274 completion tokens; failed-call usage is unknown.
No reliable monetary total is available. The provider can change the model behind its alias.

A regression test exposed a deterministic evaluator defect: zero uses counted as a passing target.
The scorer now rejects zero-use passes on both sides. The figures above were recomputed from saved outputs without more paid calls.
The private ignored report is `evals/results/targets-ai-diagnostic.json`; it contains learner-derived text and must not be committed.
The corpus and provisional review remain outside the repository. No prompt change or study rerun was made from this weak reference.

## M4 — advisory mastery and carry-forward

- Local migration `0012_mastery_advisory.sql` adds nullable per-check advisory results. Legacy checks stay null; no old completion is reclassified.
- Checks save advisory results in the same transaction as feedback, evidence, Practice, and usage. Owner isolation remains enforced.
- The calculation requires safe writing, task score ≥2, complete target evidence, nonzero uses, and errors ≤max(1, 20% of uses).
- Uses below half the first attempt do not demonstrate mastery. After two revisions, unsuccessful targets can be carried as recommendations.
- Checkpoints retain their existing rubric floor. Standalone checks and IELTS remain unchanged.
- Today and lesson pages show at most two recommendations, with unit targets before carried targets. Carrying resets at level boundaries.
- Recommendations are not graded active targets. They do not alter completion, lesson unlocking, or the trusted unit targets sent to the grader.
- The UI explicitly says lesson progress is unchanged. Enforced mastery and pass provenance remain deferred until M3 passes.
- M5 target states and spacing are implemented separately below. Authored noticing/transfer items and reviewed benchmarks remain later work. M6–M9 are not complete.

### Verification

- `npm run check`: 151 passed, 7 skipped; formatting, types, lint, and design checks passed.
- Full Playwright suite on isolated unconfigured port 3002: 278 passed, 10 skipped.
- `npm run build`: passed.
- Real PGlite tests use synthetic provider responses. They verify advisory persistence, carry-forward, owner isolation, atomic rollback, and unchanged unlocking.
- Browser checks cover Today and lesson recommendations, desktop/mobile overflow, and Vietnamese dark mode.
- Inspected screenshots: `ux/screenshots/growth-advisory-{desktop,mobile,lesson-mobile}.png`.
- Author self-review only; project instructions prohibit subagents. No hosted migration, sign-in verification, push, or deployment occurred.
- Native-speaker Vietnamese review remains pending. The AI diagnostic is live provider evidence, not human-reviewed quality evidence.

### Handoff

- Goal: continue the transfer-focused growth loop on branch `feat/growth-loop`.
- Location: `/home/very_dumb_code/Projects/writing-practice-growth-loop`.
- Next action: obtain qualified human adjudication of correction disagreements, use counts, and task scores, with 25% independent review.
- Address demonstrated grader/report failures against that reviewed reference before another paid study. Supply the Cambridge permission email date.
- Record only summary numbers and permission metadata here. Keep essays, reviewer identities, and model outputs private.
- Keep M4 enforcement disabled until reviewed precision and calibration evidence pass. Do not apply local migrations to hosted data without release approval.

## M5 — Targets in Progress

Implemented locally on `feat/target-progress` in `/home/very_dumb_code/Projects/writing-practice-target-progress`.
See the [M5 implementation decisions and acceptance checks](../superpowers/plans/2026-10-15-target-progress.md).

- Progress shows per-target first/latest error rates and raw counts from safe, completed first attempts on distinct tasks. Revisions and repeated attempts at the same task do not establish transfer.
- Levels and grader versions stay separate. The latest observed version supplies each target cohort; old and new model results are never combined. Zero uses remain unknown, not perfect.
- States are provisional: unknown, new, learning, secure, and review-due. Two consecutive distinct-task checks with at least five uses and errors ≤max(1, 20% of uses) start a review schedule.
- Successful due checks advance through 1/3/7/14/30-day intervals. Early checks do not advance spacing. Zero or insufficient uses and unsuccessful checks reset the provisional sequence.
- Due same-level targets fill unused trusted Core check slots. Unit targets take priority, with at most two active targets. Validation and evidence persistence use the same selection helper. IELTS and standalone checks remain target-free.
- English and Vietnamese copy explicitly labels the feature provisional. No calibrated improvement, benchmark comparison, proficiency certification, or changed lesson pass rule is claimed.
- No new migration or dependency is needed. Existing growth-loop migrations remain a hosted release prerequisite.

### Verification

- `npm run check`: 157 passed, 7 skipped; formatting, types, lint, and design checks passed.
- Full browser suite: `npx playwright test -c .superpowers/playwright.worktree.ts` — 284 passed, 10 skipped. The local config uses an unconfigured server on port 3003 and two workers.
- `npm run build`: passed. `git diff --check`: passed.
- Pure tests first reproduced the missing behavior. Tests cover interval boundaries/cap, resets, revisions, repeated tasks, future/malformed evidence, level/version separation, and unit priority.
- Real PGlite integration tests verify owner isolation, safety/failed-check exclusion, due-target grading and persistence, and unchanged lesson unlocking. Provider responses are synthetic.
- Browser tests cover populated/empty states, raw counts, desktop/mobile layout, and Vietnamese dark mode. Inspected screenshots: `ux/screenshots/growth-progress-targets-{desktop,mobile,vi-mobile}.png`.
- Author self-review checked the owner-scoped query, state reducer, trusted selection callers, translations, and UI. Project instructions prohibit subagents.

### Limits and next milestone

M3 precision and noise gates remain closed. These provisional rules do not establish validated mastery or measured growth.
No live signed-in hosted workflow, paid model call, hosted migration, push, or deployment occurred for M5.
Native-speaker review of Vietnamese copy remains pending.
M6–M9 local implementation is recorded below. Product-owner content review remains mandatory.
The recommended pilot dates and recruitment remain the owner’s decision (D5).

## M6–M9 — local content and behavior

Implemented on `feat/target-progress` in `/home/very_dumb_code/Projects/writing-practice-target-progress`.
The [remaining implementation plan](../superpowers/plans/2026-10-15-growth-content.md) links the approved design.

### M6: read and notice

- Optional noticing exercises expose model words, not correct spans or explanations. Authenticated server checks use trusted, unlocked lessons.
- Learners select words by keyboard or touch. Wrong answers permit retry; correct answers reveal the authored rule. This does not change lesson completion.
- All 21 Core units have draft noticing exercises. Legacy lessons without an exercise still work.

### M7: transfer drills

- Practice includes a separate new-sentence section for active targets in the current Core unit. The draft contains 124 items, with four items per selected unit target.
- Grading uses authored answers and existing normalization/spacing. No AI call occurs. Answers stay server-side until completion.
- Local migration `0013_transfer_practice.sql` adds owner-only progress and immutable answer replays. Content hashes separate changed items. Stale versions and changed retries are rejected.
- Transfer results never enter new-writing target evidence or benchmark growth. Saved-correction Practice remains separate.

### M8: matched benchmarks

- Local migration `0014_benchmark_context.sql` freezes reviewed unit/hash/role/range on reservation. Legacy writing has no benchmark context.
- Progress pairs safe first attempts from the same unit, content hash, and grader version. Mock checks, revisions, reversed chronology, and unmatched checks do not establish pairs.
- The unmatched first/latest-three table is no longer presented as growth. Weekly descriptive charts remain labelled as practice evidence.
- Benchmark values stay uncalibrated. The pure calculation supports change only beyond twice a verified, same-version human noise estimate; no such estimate is installed.
- Word count/range, mean sentence length, and bidirectional MTLD are context, not scores. MTLD requires at least 50 words; undefined values are labelled insufficient.

### M9: reading for writing

- Twelve later Core draft tasks include original passages: six summaries and six continuations. These are not a separate reading track.
- Writing Studio shows the passage and task mode. The grader receives the passage only through trusted task configuration, separately from escaped learner text.
- The prompt assesses source consistency and own-word summaries, not copying or a separate reading score. `feedback-growth-4` intentionally starts a new grader cohort.

### Content and publication boundary

`curriculum/growth.draft.json` enriches all 21 Core units while preserving identifiers. It is not approved.
`curriculum/growth.review.json` has `approved: false`, an empty reviewer, and the exact formatted draft hash.
The existing reviewed Core/IELTS files and approvals are unchanged. The opt-in `GROWTH_CONTENT=true` seed rejects unapproved growth content before connecting.
See [the existing review and release procedure](../../curriculum/README.md#growth-content-review-m6m9). Human review must check correctness and comparable prompt difficulty, not just schema validity.

### Verification

- `npm run check`: 173 passed, 7 skipped; formatting, types, lint, and design checks passed.
- Full browser suite: `npx playwright test -c .superpowers/playwright.worktree.ts` — 302 passed, 10 skipped, unconfigured port 3003, two workers.
- `npm run build`: passed. `git diff --check`: passed.
- Pure and PGlite tests cover span validation/answer stripping, locked lessons, owner isolation, transfer replay/conflicts, scheduling, frozen benchmark provenance, calibration boundaries, zero uses, and trusted reading prompts. Provider responses in these tests are synthetic.
- Tests first reproduced each behavior. The first full browser run exposed duplicate Practice controls and duplicate status regions. Distinct transfer labels and a single result status fixed those failures; the full rerun passed.
- The final check encountered the previously observed recovery-deadline timing flake in `tests/coach-request.test.ts` (`pending` instead of `failed/NOT_FOUND`). The isolated test and full rerun passed without a behavior change.
- Review found that formatting changed the draft bytes after hashing. A failing regression reproduced the stale hash; the generator now formats before hashing. Regeneration reproduces the committed draft exactly and leaves approval false.
- Desktop/mobile screenshots were inspected: `ux/screenshots/growth-{noticing,transfer,benchmarks,reading}-{desktop,mobile}.png`.
- Author self-review checked server trust boundaries, RLS, atomic writes, public payloads, old-content compatibility, and UI. No blocking finding remains in the local slice. Project instructions prohibit subagents.

### Remaining gates and handoff

Local M1–M2 and M5–M9 behavior is implemented. M4 remains advisory, not an enforced pass rule.
M3 still requires qualified human annotations, 25% independent review, precision/pass-disagreement acceptance, and same-version noise calibration. The old AI diagnostic cannot calibrate `feedback-growth-4`.
No hosted migrations, content seed, live signed-in verification, additional paid calls, push, merge, or deployment occurred for M6–M9. Native-speaker Vietnamese review remains pending.
The next action is product-owner review of the separate growth draft, followed by the approved human study and release checks. D5 pilot recruitment/dates and validated product outcomes remain undecided. Keep mastery enforcement and calibrated growth claims disabled.

### Content review fixes (unapproved draft)

The product-owner content review found defects in `curriculum/growth.draft.json`. `scripts/author-growth.py` now holds every drill, noticing span, parallel prompt and reading as data. Regenerate with `python3 scripts/author-growth.py`.

- Transfer drills: 124 items, 124 unique prompts file-wide, four per focus tag. Each explanation is one rule of 20 words or fewer. Answers list valid punctuation and contraction variants, with no more than five per item.
- Capitalization drills match capital letters exactly (`matchesPracticeAnswer` in `src/lib/practice.ts`, used by `src/lib/transfer.ts`). Other drills still ignore letter case.
- Noticing: all 21 instructions name a structure from the unit focus and select every instance in the first model text (2 to 6 spans). None uses "first two" or "occurrence" wording. Each explanation states what the structure does.
- Parallel checkpoints: first-words is first-person again. Four others regained a demand from their first prompt (balanced-argument, experience-and-advice, edit-an-application, audience-and-register).
- Reading: 12 original task prompts and fields are restored unchanged. Each lesson gets its own passage before the task. Bands: B1 150 to 220 words, B2 250 to 350, C1 and C2 350 to 500. Each passage has a read-to-write instruction (`reading.instruction`, optional), shown in place of the generic mode label.
- The task brief shows the passage above the prompt.

Checks: `npx vitest run tests/growth-content.test.ts tests/transfer.test.ts` passed. `npm run check` passed: 179 passed, 7 skipped. E2E on an isolated port 3100 (`noticing`, `transfer`, `read-to-write`): 14 passed.

Approval is still pending. `curriculum/growth.review.json` keeps `approved: false`, with the new content hash. All passages are invented teaching texts. A teacher must check facts, span meanings, accepted answers and difficulty before approval.
