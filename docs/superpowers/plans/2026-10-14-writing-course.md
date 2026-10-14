# Writing course and audit fixes implementation plan

> Execution: direct implementation in this session. No subagents. The user requested research, a detailed plan, then implementation. Preserve existing uncommitted work. Do not commit or deploy without a request.

**Goal:** Fix all seven audit findings, make saved corrections apply immediately, and build a usable writing path toward independent application letters.

**Architecture:** Keep Next.js, MUI, next-intl, Drizzle, Supabase owner transactions, and DeepSeek. Apply saved corrections in browser state while persisting choices in an ordered background queue. Grade warm-ups only on the server. Extend the existing offline curriculum and task-aware writing loop, not a second learning system.

**Spec:** PROJECT.md §§2, 7, 10–16 and the current user request. This plan records the new course scope; it does not remove human publication approval.

## Research and interpretation

The supplied IMG_1132.jpeg and IMG_1133.jpeg depict an extended motivation letter. Its useful structure is purpose → relevant background → evidence → programme fit → future contribution → closing. It is not a clean language model: it contains tense, collocation, punctuation, repetition, and factual-source problems. Do not copy its personal details into fixtures or external requests.

The target is independent, clear B2/C1 formal writing, not reproducing this letter's length or claiming a certified level. Course completion and an AI estimate are not certification. A concise 250–400-word C1 letter is a suitable capstone before longer application-specific writing.

Sources checked through Crossref and OpenAlex APIs, publisher abstracts, and accessible full text:

- Council of Europe, CEFR Companion Volume (2020): https://www.coe.int/en/web/common-european-framework-reference-languages . B2 structured argument and C1 clear, well-structured complex writing guide the target. The PDF endpoint returned 403, so no claim of full-text descriptor validation.
- Kang & Han (2015), 21-study written corrective-feedback meta-analysis: https://doi.org/10.1111/modl.12189 . Accuracy benefits depend on proficiency, setting, and genre. Publisher abstract verified through Crossref and OpenAlex; full text unavailable without an Unpaywall contact email.
- Hyland (2007), genre pedagogy: https://doi.org/10.1016/j.jslw.2007.07.005 . Teach the structure and audience of real target genres. Metadata and publisher preview checked; not full text.
- Graham & Sandmel (2011): https://doi.org/10.1080/00220671.2010.488703 . Process-writing meta-analysis reports a modest quality effect (0.34). Its school-age sample does not directly establish adult second-language outcomes.
- Wisniewski et al. (2020): https://doi.org/10.3389/fpsyg.2019.03087 . Full text checked. Across 435 studies, adjusted average feedback effect was 0.48, with high variation. Feedback information matters; this is not proof that this application's AI improves learning.

Backward/forward OpenAlex citation checks from Kang/Han and Hyland found the general-feedback synthesis above. Other broad/motivation references did not change this implementation. This is bounded product research, not a systematic review. No personal letter text was sent to these services.

## Scope and constraints

- Repair findings 1–7 from the audit: saved-mock links, revision limit, answer-key exposure, repeated Practice seeding, misleading retry hints, sign-out failures, unused drizzle-kit.
- Apply/Undo use stored text replacements, never an LLM. Local changes must appear before network completion.
- Automatically select the next open, non-dismissed correction after Apply. Keep the final correction visible when none remain. Undo does not advance.
- Serialize saves; allow another correction while the first saves. Surface failed writes globally so advancing cannot hide them. Preserve local edits for retry; never label them saved before acknowledgement.
- A failed initial choice load must not silently permit overwriting unknown saved state.
- Keep API ownership, daily limits, timeouts, and provider validation. No extra dependencies.
- English/Vietnamese labels, MUI-only UI, keyboard and mobile support.
- Extend the course to PRE_A1–C2. First complete bounded course: 3 units per level, 3 lessons per unit (21 units, 63 lessons). This is not the originally envisioned 15 units per level.
- Each unit has a model, two answerable warm-ups per lesson, three distinct writing tasks, and a final checkpoint. Models and tasks must teach actual genre skills, not repeat the same sentences at every level.
- Keep existing published identifiers stable. Add original content; do not silently replace learner task histories.
- Retain exact-hash human-review gating. Implement and verify locally; do not fabricate teacher approval or seed hosted content.
- Placement remains an A1–B1 estimate initially. New beginner/advanced starts are learner choices, not an unvalidated seven-level placement claim.
- Word ranges and character limits follow PROJECT.md §7.1 and §16. Add scaffold `none` for advanced independent writing.
- A lesson needs both warm-up completion and safe writing before completion. Checkpoints require average rubric ≥3.5 and grammar ≥3. Other lessons require a safe completed writing check; they do not assert mastery.

## Review focus

Delayed or failed saves must not lose edits; concurrent Apply/Undo must persist in order; restored suggestions must re-enter Practice; browser payloads must contain no answer keys; reaching revision 20 must offer an honest continuation. Every condition receives a regression test in its owning task.

## Task 1 — Instant corrections and revision boundaries

Files: src/components/feedback/{use-correction-choices,FeedbackView}.tsx/ts, src/app/feedback/[submissionId]/page.tsx, src/app/write/[taskId]/page.tsx, src/lib/limits.ts, src/lib/feedback/input.ts, messages/{en,vi}.json, tests/e2e/correction-choices.spec.ts, tests/database.test.ts.

- [ ] Write browser tests holding save responses: text and next correction change immediately; a second Apply is possible; failed persistence remains visible with retry; no explanation/feedback provider request occurs.
- [ ] Run focused Playwright and observe failure.
- [ ] Add optimistic local choices with ordered background writes and explicit load/save errors. Keep report-result handling intact.
- [ ] Use `preview`, not `mock`, for revision/compare links. Pass attempt into FeedbackView, share the 20-attempt limit, and offer a new draft at the limit. Direct forged revision URLs must return a limit screen, never an unusable editor.
- [ ] Run focused browser and revision database tests. Capture desktop/mobile screenshots before moving on.

## Task 2 — Audit backend and dependency fixes

Files: src/lib/{curriculum,practice}.ts, src/lib/db/{curriculum,practice,queries}.ts, src/app/login/actions.ts, src/components/layout/AppNavigation.tsx, curriculum fixtures, package manifests, database/auth/practice/curriculum tests.

- [ ] Add failing tests: public path/lesson has no `answer`; server answers still grade; repeated Practice reads do not re-insert a 100-submission history; safety feedback creates no drills; restored corrections return; `could reely choose` must not get a verb-form rule; sign-out errors return a visible failure result.
- [ ] Separate public lesson data from server grading content at the loader boundary, including previews.
- [ ] Seed drills in completeSubmission's existing transaction. Legacy backfill is bounded and tracks processed submissions, including zero-card sources; retain dismissed drills for restoration but exclude them from due reads. Avoid holding a learner lock to reseed the full history.
- [ ] Remove inferred modal grammar from retry copy; keep the exact mismatch/replacement.
- [ ] Return a typed sign-out result and show revocation failure without claiming all sessions ended. Disable repeat clicks while pending.
- [ ] Remove unused drizzle-kit with npm and update lockfile.
- [ ] Run npm run check plus focused database/browser regressions.

## Task 3 — Full-level course contracts and progression

Files: src/lib/curriculum.ts, src/lib/db/curriculum.ts, src/components/curriculum/{Placement,LearningPath,LessonView}.tsx, scripts/seed-curriculum.ts, curriculum JSON/README, tests/curriculum*.test.ts, tests/e2e/curriculum*.spec.ts.

- [ ] Write failing tests for all seven levels, exact word ranges, scaffold none, writing-required lesson completion, checkpoint locks, and safe server grading.
- [ ] Expand level/task schema and level ordering. Preserve A1–B1 estimate validation separately from selectable course levels.
- [ ] Add ordered original units for foundations, linked ideas, evidence, formal correspondence, argument, application writing, and critical editing. Author and validate 63 complete lessons; name content draft until reviewed.
- [ ] Keep answer keys in server-only content. Expose only prompts/options and saved correctness.
- [ ] Show lesson reading/practice/writing progress and the next actionable lesson without inventing completed writing.
- [ ] Let development previews exercise every lesson by ID and the complete write/check/revise sequence. Production still uses approved database content.
- [ ] Validate counts, IDs, ranges, choice answers, model lengths, and checkpoint placement. Add full-course traversal tests with synthetic safe feedback; a failed checkpoint must not unlock anything.

## Task 4 — End-to-end verification and handoff

- [ ] Run npm run format, npm run check, production build, and full Playwright suite with explicit test environment.
- [ ] Inspect desktop/mobile course and correction screenshots, accessibility, keyboard, English/Vietnamese, and dark mode.
- [ ] Review the connected diff directly. No subagents.
- [ ] Update PROJECT.md status and curriculum/README.md with verified scope, evidence, and publication steps. Mark remaining human review, live OAuth, hosted migration, and deployment gates separately.

## Deferred

No certified exams, guaranteed scholarship outcomes, C2 certification, new paid models, live lesson generation, long-form editor beyond specified limits, or public release without abuse controls. The learner must supply truthful experiences and verify programme facts; the coach must not invent achievements or citations.
