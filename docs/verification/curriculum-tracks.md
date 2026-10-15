# Core and IELTS track verification

## Delivered behavior

- Core contains 21 units and 63 lessons. IELTS contains eight units and 24 lessons. All previous Core unit, lesson, and task identifiers remain present.
- `/path?track=core` and `/path?track=ielts` select URL-backed tabs. Browser back/forward restores the selected track. Invalid or missing values use Core.
- Core retains placement-based sequential progression. IELTS allows entry into any unit without Core placement. Later lessons in each IELTS unit still require warm-ups and safe writing. Checkpoints retain average ≥3.5 and grammar ≥3.
- IELTS groups Academic Task 1, General Training Task 1, and Task 2. Cards show outcomes, translated grammar-focus labels, completion counts, and progress bars.
- Today retains its Core summary and adds an IELTS Workspace entry.
- Lesson and Studio views show IELTS module and word/time contracts: Task 1 minimum 150 words/20 minutes; Task 2 minimum 250 words/40 minutes.
- Feedback maps the existing four rubric scores to Task Achievement or Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. Scores remain 1–5 practice scores, not IELTS bands.
- Shared database loaders resolve lessons and tasks from either reviewed track. Server-only draft imports remain limited to tooling and development previews. Public lessons omit answer keys and hints.
- The seed command requires separate exact-hash human approvals for Core and IELTS before opening a connection. Both tracks upsert atomically. No new migration is required.

## Supplied-content adjustments

The supplied generator initially checked models against CEFR bounds. IELTS task limits also used CEFR ranges in several units, contrary to the requested Task 1/2 contracts. The application now validates models against their task limits and enforces IELTS 150–180/250–350 ranges separately from Core CEFR ranges.

The generator sets those IELTS ranges explicitly. Three process/map models were shortened to Task 1 length. Six opinion/discussion models received additional paragraphs to reach Task 2 length. These edits remain drafts requiring teacher review. The generator now correctly reports Python validation separately from actual Zod validation.

The supplied Core changes replace earlier models and task descriptions while preserving all identifiers. Browser fixtures now read the actual warm-up counts and optional advanced word banks rather than assuming two warm-ups and no C1 word bank.

## Verification

- `python3 scripts/author-course.py --out-dir /tmp/writing-practice-track-validation`: both tracks passed Python validation. Generated JSON content matched the application drafts.
- `npx tsx scripts/generate-curriculum.ts --validate`: individual and combined Zod validation passed with no provider call.
- `npm run check`: formatting, types, lint, design checks, and 111 tests passed; seven opt-in live checks skipped.
- `tests/course-progression.test.ts`: traverses all 87 lessons through real database loaders and server warm-up grading in PGlite with owner row-level security. Unsafe checks and failed checkpoints stay blocked. A second learner's progress remains unchanged.
- `tests/curriculum-seed.test.ts`: missing either approval and changing either approved file block publication before connection.
- Focused browser checks passed for both tracks, independent module entry, URL history, Task 1/2 contracts, appropriate feedback labels, and Today entry at desktop and mobile sizes.
- Full browser suite: 202 passed and 10 intentional skips, using an explicitly unconfigured webpack development server. Log: `/tmp/ielts-e2e-webpack-final.log`.
- `npm run build`: default production build passed. Production smoke: `/today` returned 200, anonymous `/path?track=ielts` redirected to sign-in, and draft path/API previews returned 404.
- `node scripts/audit-curriculum-tracks.mjs`: 12 scans cover path, lesson, Studio, and feedback at desktop, mobile, and Vietnamese dark-mobile sizes. Zero accessibility violations and no horizontal overflow. Desktop feedback has one incomplete color-contrast check involving seven nodes; this is not a contrast pass.

Artifacts: [accessibility results](ux/curriculum-tracks-accessibility.json) and `ux/screenshots/ielts-*.png`.

A full check initially reproduced the known recovery-test timing issue in `tests/coach-request.test.ts:78`: expected `NOT_FOUND`, received `pending` with a 100-ms deadline. Its focused six-test rerun and a complete repeated check passed without a production-code change. This existing flake remains unresolved.

Earlier browser attempts were not successful: one server restart lost the explicit test environment; another Turbopack run appended the old sample draft during the existing editor selection test. The same selection tests passed under webpack without an application change. The final full run used webpack with explicit test settings and passed. This does not establish that the Turbopack development behavior is fixed; the default production build passed separately.

## Changed-file inventory

| Files | Change |
|---|---|
| `scripts/author-course.py`, `curriculum/course.draft.json`, `curriculum/ielts.draft.json` | Supplied authoring content, task-specific IELTS lengths, validated models, preserved Core identifiers |
| `scripts/generate-curriculum.ts` | Offline validation of both tracks before any separately approved legacy generation call |
| `scripts/seed-curriculum.ts` | Separate exact-hash approvals and atomic combined seed |
| `src/lib/curriculum.ts` | Track enum/type, ID/module helpers, track filtering, task-specific schema validation |
| `src/lib/curriculum-content.ts` | Server-only combined draft loading and track lookup |
| `src/lib/curriculum-path.ts`, `src/lib/db/curriculum.ts` | Track-aware progression and database lesson/task resolution |
| `src/app/path/page.tsx`, `src/components/curriculum/LearningPath.tsx` | URL track selection, bilingual tabs, groups, outcomes, grammar badges, progress |
| `src/components/curriculum/IeltsContract.tsx`, `src/components/curriculum/LessonView.tsx`, `src/components/studio/TaskBrief.tsx` | Shared IELTS contracts and track-preserving lesson return links |
| `src/components/feedback/ScoreBars.tsx`, `src/components/feedback/FeedbackView.tsx` | IELTS rubric labels selected from the saved task ID |
| `src/components/today/Today.tsx` | IELTS entry alongside Core summary |
| `src/app/dev/preview/[screen]/page.tsx`, `src/app/dev/preview/course-api/route.ts`, `src/mocks/course-content.ts`, `src/mocks/course-preview.ts` | Development-only track previews and server grading |
| `messages/en.json`, `messages/vi.json` | Tabs, modules, contracts, rubric labels, progress, and scale disclaimers |
| `tests/curriculum-tracks.test.ts`, `tests/course-progression.test.ts`, `tests/curriculum-seed.test.ts` | Validation, independent entry, 87-lesson ownership/progression, review gates |
| `tests/e2e/curriculum-tracks.spec.ts`, `tests/e2e/course.spec.ts` | Browser track flows and updated supplied-content fixtures |
| `scripts/audit-curriculum-tracks.mjs`, `docs/verification/ux/curriculum-tracks-accessibility.json`, `docs/verification/ux/screenshots/ielts-*.png` | Repeatable 12-screen audit and artifacts |
| `PROJECT.md`, `README.md`, `curriculum/README.md`, `docs/verification/curriculum-tracks.md` | Current contracts, publication instructions, evidence, and limits |

The root-level supplied `author-course.py`, `course.draft.json`, and `ielts.draft.json` were retained unchanged. They are not application inputs. Next.js-generated `next-env.d.ts` is excluded from the implementation changes.

## Release limits

No teacher approval, hosted content seed, new migration, live DeepSeek grading, commit, push, or deployment was performed for this slice. Production shows only previously reviewed database content, not the draft files. Follow [publication instructions](../../curriculum/README.md) before enabling the new content for learners.

Existing rate limits, database connection limits/deadlines, owner policies, placement estimate bounds, and checkpoint criteria are unchanged. Draft Band 7/8 title claims are unvalidated teaching goals. No IELTS score prediction or learning-effectiveness claim is made.
