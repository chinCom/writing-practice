# Phase 3: placement and learning path

## Implemented

- `/placement` collects two short writing samples and three grammar answers.
- DeepSeek returns a strict A1–B1 practice estimate, confidence, explanation, and safety flag.
- The learner can accept the estimate or choose another A1–B1 starting level.
- Placement permits three attempts per UTC day. A pending request blocks another call. Failed attempts count.
- `/path` shows level units, lesson states, and checkpoint markers.
- `/lesson/[lessonId]` shows a short lesson and model. It checks warm-ups on the server without AI calls.
- Correct warm-up answers persist privately. Incorrect answers return a hint. Failed saves retain the answer.
- A checkpoint unlocks the next unit only after all warm-ups and a safe saved writing result with average score ≥ 3.5 and grammar ≥ 3.
- Earlier levels remain available for review when a learner chooses a higher starting level.
- The writing editor loads the saved task, level, checklist, frames, word bank, word minimum, and character limit.
- Drafts and revisions keep their task identifiers. The coach receives trusted task configuration from the database, not from the learner.
- New protected pages refresh session cookies. API responses use owner checks and private, non-cached responses.

## Evidence

- `npm run check`: formatting, types, lint, design rules, and 83 local tests passed; five live checks are opt-in.
- `npm run test:e2e`: 138 passed and six intentional skips. Browser API responses are synthetic. Tests cover placement choice, failed requests, safety, warm-ups, locks, and highlighted retry words.
- `npm run build`: passed.
- `RUN_LIVE_PLACEMENT=true npx vitest run tests/live-placement.test.ts`: one real provider estimate passed using synthetic writing.
- `tests/curriculum-database.test.ts`: real PGlite PostgreSQL tests cover private placement, attempt limits, warm-up persistence, blocked tasks, and checkpoint unlock rules.
- `npm run db:migrate`: applied `drizzle/0008_curriculum.sql` to the hosted database without deleting writing or feedback.
- `node scripts/audit-curriculum.mjs`: nine accessibility scans reported zero violations. Desktop and mobile screenshots are under `docs/verification/ux/screenshots/curriculum-*`.
- `npm run curriculum:generate`: produced `curriculum/a1-b1.generated.json` offline using the provider. The first response failed schema validation and was not published. The corrected generation passed validation.
- `npm run curriculum:seed`: refused publication because human approval is absent.

## Suggested-text UI

Practice hints highlight only exact words or phrases from the saved suggestion. For “Use let before a base verb like unwind,” **let** and **unwind** receive a yellow background and bold text. The rest stays plain. Text renders as React text, never model-provided HTML. Hints do not reveal a full answer before the normal reveal step.

## Remaining gate

**The human-reviewed content milestone is not complete.** The offline draft covers three units and six lessons. The generated candidate also covers A1–B1. Neither has human approval. The hosted curriculum stays empty until a qualified reviewer approves the exact content hash. See [the review procedure](../../curriculum/README.md).

No new signed-in hosted browser journey was run for placement or curriculum. The live provider test is not a placement accuracy study. This flow does not certify CEFR. Level exams, broad course coverage, and cross-level human evaluation remain separate work.

These changes are local, uncommitted, unpushed, and not deployed.
