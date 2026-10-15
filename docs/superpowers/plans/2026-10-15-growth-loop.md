# Growth Loop Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Project instructions prohibit subagents.

**Goal:** Implement the [Growth Loop design](../specs/2026-10-15-growth-loop-design.md) in independently verified milestones.

**Architecture:** Extend the existing grader, owner-scoped transactions, feedback UI, and evaluation functions. Keep target state derived from immutable evidence. Use additive migrations, optional feedback fields, and existing content-review gates.

**Tech Stack:** Next.js, React, MUI, next-intl, Zod, Drizzle, Supabase Postgres, Vitest/PGlite, Playwright. No new dependency.

## Global constraints

- Pass rule stays unchanged until human-annotated precision ≥ 0.85 and pass disagreement ≤ 10% (§9.2).
- Noise study needs 30 texts graded three times with a pinned prompt/model (§9.3).
- Human review gates authored content. Do not publish AI drafts or invent evaluation results.
- Core only initially; IELTS progression stays unchanged. Maximum two active targets.
- Revisions are practice, never new-writing growth evidence. Keep practice-score disclaimers.
- Keep old feedback readable. Unsafe writing produces no target evidence.
- Work in `../writing-practice-growth-loop`, branch `feat/growth-loop`; preserve unrelated original-checkout edits.
- No hosted mutation, push, or deployment. Verify migrations locally through PGlite.

## Review focus

1. Correction filtering/reordering must not leave target indexes referring to different corrections (Task 1).
2. Empty/partial/malformed reports must not become perfect mastery or break ordinary feedback (Task 1).
3. Evidence cannot be reassigned, updated, or associated with another owner's submission (Task 2).
4. Old feedback, safety state, zero uses, and mobile wrapping must remain usable (Task 3).
5. A hidden answer must not leak through previews, accessible labels, explanation requests, or saved Apply state (Task 4).

## M1: Focused check

### Task 1: Trusted targets and report validation

**Files:** `src/lib/targets.ts`, `src/lib/feedback/schema.ts`, `src/lib/llm/grade.ts`, `src/lib/prompts/{feedback.system.md,version.ts}`, `tests/{targets,llm,feedback}.test.ts`.

**Interfaces:** `targetsForUnit(unit: CurriculumUnit): ErrorTag[]`; `validateTargetReport(feedback: Feedback, targets: ErrorTag[]): Feedback`; `locateFeedback(text: string, feedback: Feedback): LocatedFeedback`; `GradeOptions.targets?: ErrorTag[]`.

- [x] Write failing tests for deterministic first-two countable unit tags, Core-only selection, optional old feedback, invalid counts/tags/indexes/duplicates, filtered and overlapping corrections, and zero uses.
- [x] Run focused Vitest tests and inspect the failures.
- [x] Add optional strict report shape (max three entries; uses/errors 0–100; correction indexes 0–11). Drop the entire report on inconsistency, partial target coverage, safety, or unsupported targets. Preserve ordinary feedback.
- [x] Filter countable targets to existing grammar/mechanics tags plus connectors. Broad vocabulary/discourse tags stay feedback-only; authored transfer coverage is still a later milestone.
- [x] Pass trusted targets separately from learner input; explain obligatory contexts, exact error indexes, conservative correction rules. Bump prompt version; retain the current deadline and measure output budget.
- [x] Validate before and after locating corrections. Remap indexes to surviving corrections; discard report if a reported correction was removed.
- [x] Verify focused tests and commit.

### Task 2: Atomic owner-only target evidence

**Files:** `drizzle/0010_target_evidence.sql`, `src/lib/db/{schema,queries,curriculum}.ts`, `src/app/api/feedback/route.ts`, `tests/{database,curriculum-database}.test.ts`.

**Interfaces:** `loadTaskContext(userId: string, taskId: string): Promise<{task: CurriculumTask; targets: ErrorTag[]}>`; existing `loadTask` remains compatible. `target_evidence` key `(submission_id, tag)`, stores owner, level, uses/errors, nullable self_fixed, first-attempt/benchmark flags, grader version, timestamp.

- [x] Write failing route-to-database test with real PGlite and synthetic provider output. Assert report persistence, model+prompt version, first-attempt flags, legacy compatibility, no unsafe evidence, retry idempotency, isolation, foreign-owner rejection, immutability, and cascade deletion.
- [x] Run and inspect expected failures.
- [x] Add additive migration with owner RLS, SELECT/INSERT only, composite owner foreign key, count checks, bounded tags, and owner/date index. Use this repo's Drizzle migration workflow, not a new Supabase workflow.
- [x] Derive targets from the server-loaded, unlocked unit. Keep standalone and IELTS checks target-free.
- [x] Complete submission, feedback, evidence, practice, and usage in one transaction. Do not mark checkpoints as benchmarks until parallel prompts exist.
- [x] Run integration tests and commit.

### Task 3: Target-first feedback

**Files:** `src/components/feedback/{TargetReport,FeedbackView}.tsx`, `src/app/dev/preview/[screen]/page.tsx`, `messages/{en,vi}.json`, `tests/e2e/feedback-targets.spec.ts`.

**Interface:** `TargetReport({report}: {report: NonNullable<Feedback['target_report']>})`.

- [x] Write browser tests for target section before strengths, correct/uses counts, errors, zero-use wording, absent legacy report, and safety suppression.
- [x] Run tests red, add a small MUI section using translated labels. No new animations.
- [x] Run browser tests at desktop and mobile sizes; capture and inspect screenshots before expanding UI.
- [x] Run `npm run format`, `npm run check`, full browser suite, and build. Update `PROJECT.md` §0 and evidence; self-review and commit.

## M2: Self-revision

### Task 4: Self-fix and assistance provenance

**Files:** `src/components/feedback/{FeedbackView,CorrectionCard,MarkedText}.tsx`, `src/lib/{revision,improvement}.ts`, `src/lib/db/{schema,queries,corrections}.ts`, `src/app/write/[taskId]/page.tsx`, additive migration, message catalogs, revision/database/browser tests.

- [x] Test first-attempt target answers hidden everywhere; non-target Apply unchanged; Show me explicitly reveals; revision reveals; legacy feedback unchanged.
- [x] Add target cues without suggestions, explanation answer leaks, or target Apply. Preserve reporting/dismissal. Gate rewrite until revision or Show me.
- [x] Store server-derived `revision_kind` (`self`/`assisted`) from persisted target assistance, not a client assertion. Preserve assistance history even after Undo.
- [x] Test and report avoided targets when uses fall below half the first attempt; avoid claiming these were fixed.
- [x] Rename revision-gain learner copy to “How much you fixed”; do not describe it as transfer.
- [x] Verify integration/browser tests, screenshots, full checks, update status, self-review, commit.

## M3–M9: Gate-dependent work

- M3: Extend `src/lib/evaluation.ts` and existing eval harness for precision, three-run pass disagreement, and pinned-version noise calibration. Tests use synthetic annotations, explicitly labeled. **Real results require 40 hand-annotated A1–B1 texts, second review of 25%, plus calibration corpus.** Record pending studies, not a passing gate.
- M4: Pure advisory mastery/carry-forward calculation first. Enforce only after M3 passes. Persist legacy/mastery/carry-forward provenance and add Today targets. No IELTS rule change.
- M5: Derived target states, first-attempt rates, existing 1/3/7/14/30-day intervals, pinned-version comparisons. Unknown/no-use evidence must not imply secure mastery.
- M6: Optional noticing schema, local span grading, reviewed content and phone UI. Product owner reviews all Core noticing drafts before publication.
- M7: Optional authored transfer item schema and existing Practice integration. Review required before publication; no generated-on-answer drills.
- M8: Reviewed parallel prompts, same-version/noise-aware benchmarks, then-vs-now replacement, deterministic word range/sentence length/MTLD context.
- M9: Reviewed summary/continuation tasks in later units. No separate reading module.

D5 pilot recruitment and dates remain a product-owner decision. Each milestone gets a concrete test-first slice before implementation. M1 and M2 are implemented and verified. M3 tooling is implemented; the human study remains blocked on the reviewed corpus. Later gates are not waived by this plan. See [verification and remaining inputs](../../verification/growth-loop.md).
