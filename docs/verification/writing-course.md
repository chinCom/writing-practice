# Writing course and audit fixes verification

Branch: `feat/writing-course`. Implementation is local; hosted migration and publication remain gated. No subagents were used.

The [research and implementation plan](../superpowers/plans/2026-10-14-writing-course.md) records sources, scope, and decisions. [Publication instructions](../../curriculum/README.md) are authoritative for content approval.

## Implemented behavior

### Corrections

Apply changes the displayed text immediately and selects the next open correction. It skips applied and dismissed suggestions. The last correction stays visible when no open suggestion remains. Undo stays on the selected correction.

Writes run in an ordered background queue with a ten-second deadline per write. Another Apply does not wait for the network. Failed writes preserve local choices and expose an explicit retry, including inside the mobile sheet. Pending or failed persistence triggers the existing navigation warning. The interface does not label an unacknowledged fix as saved.

Apply and Undo do not request an AI response. A failed initial choice load blocks edits until retry succeeds.

### Seven audit findings

| Finding | Repair | Evidence |
|---|---|---|
| Saved mock feedback used development links | Only the explicit `preview` result uses development destinations | Revision boundary test and connected feedback link review |
| Revision 20 offered an unusable attempt 21 | Shared limit; feedback offers a new draft and forged revision URLs show a limit screen | `tests/revision-boundary.test.ts` |
| Lesson answers reached browser payloads | Public lessons omit answers and hints; grading reads trusted server content | Course traversal, curriculum database tests, browser payload assertion |
| Practice reread and reseeded the full history | Seed on submission completion; track every processed source; backfill at most ten unprocessed sources per read | Database tests with 100 legacy submissions, zero-card and safety cases |
| Adverb mistakes received an unsupported modal verb rule | Describe the exact remaining mismatch without an inferred grammar claim | Practice unit and browser regressions |
| Sign-out hid provider failures | Return a typed failure and show a retryable error; redirect only on success | `tests/audit-regressions.test.ts` and account footer review |
| Unused drizzle-kit dependency | Remove the package and regenerate the lockfile | Package manifest/lock review and local checks |

Dismissed Practice drills remain stored but do not appear in due results. Restoring the correction makes the drill eligible again.

### Course

The draft contains 21 units and 63 lessons across seven levels. It preserves the original lesson/task identifiers. Each unit ends with a checkpoint. Advanced independent tasks omit unused word banks and sentence frames.

A lesson needs completed warm-ups and a safe writing result. A checkpoint also needs average rubric score ≥3.5 and grammar ≥3. The placement estimate stays A1–B1; the selected starting level can be PRE_A1–C2.

`tests/course-progression.test.ts` traverses all 63 lessons through the real database loaders and warm-up grader under owner row-level security. It proves that unsafe writing and failed checkpoints do not unlock lessons. A second learner's path stays unchanged. This uses PGlite and synthetic scores, not live provider grading or measured learning outcomes.

The browser course test completes two warm-ups, writes a short introduction, receives a labelled synthetic result, revisits the same task with its writing retained, and opens the next lesson. Synthetic previews disable real draft saving. A C1 task confirms independent writing without an empty word bank. Desktop and mobile tests also reproduce and check the warm-up label overlap repair.

The advanced grading prompt uses `feedback-course-2` so stored feedback can distinguish the new level-specific guidance from the old A2 prompt.

## Verification

- `npm run check`: format, types, lint, design rules, and 96 tests passed; seven opt-in live checks skipped.
- `node scripts/audit-course.mjs`: nine scans found zero accessibility violations and no horizontal overflow. Screens cover path, beginner lesson, and C1 writing at desktop and mobile sizes, including Vietnamese dark mode. Three lesson scans have one incomplete color-contrast result each; these are not automated contrast passes.
- `node scripts/audit-correction-choices.mjs`: six scans passed with zero violations across desktop, mobile, and Vietnamese mobile correction/report screens.
- `npx playwright test --workers=1`: 166 passed and ten intentional project-specific skips, with no failures.
- `npm run build`: production build passed using the default Turbopack builder.
- Production HTTP smoke check: `/today` returned 200; full-course preview and course API returned 404.
- Direct connected-code review found and repaired the preview Save/revision destinations and stale feedback prompt version. No independent reviewer was used, per the no-subagents instruction.

Artifacts: [course accessibility report](ux/course-accessibility.json), [correction accessibility report](ux/correction-choices-accessibility.json), and `docs/verification/ux/screenshots/course-*.png`.

Repeat commands:

```sh
npm run check
npx playwright test --workers=1
npm run build
node scripts/audit-course.mjs
```

Browser checks require the test development server on port 3000 with explicit empty Supabase/database environment values and `GOOGLE_AUTH_ENABLED=false`. These tests use synthetic workflows and intercepted provider responses. They do not test live OAuth or authenticated hosted grading.

## Limits and release gates

- No teacher approval was fabricated. The exact-hash seed gate rejects absent or stale approval.
- Migration `drizzle/0009_writing_course.sql` was tested locally, not applied to hosted Supabase. Deploying this code without that migration would leave incompatible database contracts.
- The course is an offline draft, not the original 15-unit-per-level target, CEFR certification, or evidence of educational effectiveness.
- Original models use fictional details. The supplied private motivation letter was not copied into fixtures or research requests.
- New live higher-level grading, hosted course publication, live sign-out failure handling, sustained load, and actual learner progress remain unverified.
- One final `npm run check` attempt failed the existing timing-sensitive `tests/coach-request.test.ts` missing-reservation case: expected `NOT_FOUND`, received `pending`. Its 100-ms real-network deadline can expire under load. The focused six-test run and the complete repeated check passed without a code change. This flake remains unresolved.
- Public abuse controls, privacy/legal review, and other existing release gates remain active.
- The development server exhibited repeated Turbopack refreshes during this session. Verification used webpack development mode. No application fix for that development-tool behavior is claimed.
- An earlier full browser run was interrupted by the tool deadline. A later detached attempt lost its development server. Another attempt had one navigation timeout and two missing trace artifacts during overlapping test runs. None is counted as successful verification. The final isolated full run passed.
