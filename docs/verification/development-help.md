# On-demand writing development help

## Behavior

Both writing editors have **Help me develop this** beneath the task word bank in the left column. Mobile screens stack this section before the editor. A nonempty draft can request help before the task word minimum. The normal grading minimum does not change.

The button sends `{ taskId, text }` to `/api/development`. Typing does not call this endpoint. The server checks authentication, origin, strict input, task access, and the task character limit. The server uses the chosen learning-path level, then the saved profile level, then the task target level. The client cannot supply a level or user identity.

The AI returns encouragement, one question, an optional incomplete sentence starter, and one small next step. The learner writes the answer. The prompt prohibits grading, full rewrites, invented facts, and completed essays. These are prompt instructions, not a guarantee of model behavior. The response schema rejects assessment fields and bounds each output field.

The response can include `focus_text`, an exact quote connected to the question. The server accepts only a unique literal match in the submitted draft. Invented or ambiguous quotes become empty strings without discarding the rest of the guidance. Missing quotes remain compatible with older responses. **Show in my writing** scrolls to the editor, focuses the editor, and selects the quoted passage. The button never inserts or changes text. The client rechecks the current text before showing a link.

The editor remains usable during a request. Duplicate clicks are disabled. An edited draft hides older guidance. Failed requests keep the writing and require another button press. A safety-flagged response replaces all generated fields with a fixed support message.

Development help does not create a submission, change scores, unlock a lesson, generate Practice, or insert writing. Guidance is in English; the interface supports English and Vietnamese.

## Limits and privacy

Requests share the existing 60-new-attempt UTC daily allowance with explanations. The existing owner lock and owner-only request ledger enforce this limit. Failed provider attempts count. Cached explanations remain reusable without another request. No new database table or migration is needed.

Only the request count is stored for development help. The short draft and generated guidance are not saved by this endpoint. The app sends the draft, trusted task context, and learner level to DeepSeek. It does not send account identity, native language, or the rest of the profile. Other explicit actions, such as Save draft, retain their existing storage behavior.

The adapter uses JSON output, disabled thinking, 500 output tokens, a shared 15-second provider deadline, one validation retry, and no automatic transport retries. The browser deadline is 30 seconds. Usage is returned internally by the adapter but is not persisted in `ai_usage`, which requires a submission. This remains a cost-observability limitation.

## Verification

Tests were written before implementation. The linked-guidance regression first failed because the panel was beneath the editor. The adapter regression first rejected the new quoted-passage field. Browser tests failed because the button did not exist. Adapter and database tests failed because the new modules did not exist.

- `tests/development.test.ts`: real local HTTP boundary verifies provider request, strict output, invalid-output retry, stalled-request timeout, and rejection of invented or ambiguous focus quotes.
- `tests/database.test.ts`: PGlite with owner RLS verifies short-draft help, trusted saved level, no submission, shared quota, failed-attempt counting, owner isolation, and authentication/origin/input boundaries. AI output is synthetic.
- `tests/e2e/develop-writing.spec.ts`: synthetic desktop/mobile responses verify left-column placement, exact passage selection in both editors, leading-space offsets, click-only use, unchanged draft, retries, stale guidance, duplicate protection, and safety handling.
- `scripts/audit-development-help.mjs`: synthetic-response screenshots at desktop, mobile, and Vietnamese dark mobile sizes. All three scans report zero detected accessibility violations and no horizontal overflow. Each scan has one incomplete color-contrast check, which is not a verified pass. Updated screenshots show the relocated panel and its quoted-passage button.

Artifacts: `docs/verification/ux/development-help-accessibility.json` and `docs/verification/ux/screenshots/development-help-*.png`.

Repeat:

```sh
npm run check
npx playwright test tests/e2e/develop-writing.spec.ts tests/e2e/live-hints.spec.ts tests/e2e/lesson-submit.spec.ts --workers=1
node scripts/audit-development-help.mjs
npm run build
```

Final results:

- `npm run check`: 108 passed, seven opt-in tests skipped; formatting, types, lint, and design checks passed.
- Full desktop/mobile Playwright suite: 196 passed, ten intentional skips. Log: `/tmp/linked-development-e2e.log`.
- `npm run build`: passed with the default Next.js production compiler. The traced `/api/development` bundle includes `development.system.md`.
- Production smoke test: anonymous `POST /api/development` returns 401; `/dev/preview/live-write` returns 404.

The current linked-guidance checks passed. Earlier development-help verification encountered stale privacy-copy assertions and the existing 100-millisecond recovery-test timing failure in `tests/coach-request.test.ts:78`. Those earlier results do not replace the current passing checks. No live DeepSeek call, signed-in hosted request, or deployment is included in this evidence.
