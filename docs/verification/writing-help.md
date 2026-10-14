# Background writing help and Enter submission

## Implemented behavior

- **A little help** reads the current draft in both Writing Studio variants.
- Analysis starts after a 500 ms typing pause and runs in a browser Web Worker.
- The panel shows at most three hints. It never changes the writing.
- Narrow checks cover selected irregular past forms, direct past-time cues, accidental repeated function words, task length, the weekend invitation, and advanced paragraph breaks.
- Quoted grammar examples do not trigger the verb checks. Valid repeated verbs and demonstratives are not treated as typing errors.
- Revision identifiers reject stale results. Editing immediately hides hints for the previous draft.
- Unsupported, failed, or unresponsive workers show an unavailable message. The response deadline is three seconds after dispatch.
- Workers terminate on unmount. Typing pauses cancel queued analysis.
- These checks send no writing to a server and consume no AI quota. They are not a full grammar review.
- English and Vietnamese labels explain the limits. **Check my writing** remains the full AI review action.
- Desktop help appears beside the writing canvas. Mobile help appears below the canvas.

Lesson warm-ups now use native form submission. Enter runs **Check answer**. Empty, completed, and pending checks cannot submit again.
The development lesson preview uses a development-only endpoint instead of the authenticated learner endpoint.
The preview checks known warm-ups and rejects cross-origin requests. It saves no learner progress and returns 404 in production.

## Repeat checks

```sh
npm run check
npx playwright test tests/e2e/live-hints.spec.ts tests/e2e/lesson-submit.spec.ts --workers=1
node scripts/audit-writing-help.mjs
npm run build
```

The full browser suite requires a development server started with explicit empty Supabase/database settings and `GOOGLE_AUTH_ENABLED=false`.
Environment variables on the test command do not change an already-running server.

## Evidence and limits

- Unit tests exercise current text, clean/empty text, quoted examples, valid repetition, task-specific hints, and advanced task ranges.
- Browser tests cover both editors, unchanged writing, current-result replacement, no feedback/hint API requests, stale results, worker construction failure, and a hung worker.
- Lesson browser tests cover Enter, wrong/correct answers, pending requests, retry, known warm-ups, and cross-origin rejection.
- Six accessibility scans cover both editors at desktop, mobile, and Vietnamese dark mobile sizes. No violations, incomplete checks, or horizontal overflow remained.
- Screenshots and scan details: [UX artifacts](ux/writing-help-accessibility.json), `ux/screenshots/writing-help-*.png`.
- Synthetic local timing: 1,000 analyses of a 6,498-character C1 draft took about 63 ms total. This measures the analyzer only, not browser worker startup or end-to-end latency.

- `npm run check`: 102 tests passed; seven opt-in tests skipped. Formatting, types, lint, and design checks passed.
- Full Playwright suite: 182 tests passed; ten intentional skips. Log: `/tmp/writing-help-e2e-verified.log`.
- `npm run build`: the default Next.js production build passed.
- Production smoke check: the lesson preview endpoint returned 404.
- A browser harness loaded the production-built worker through its generated bootstrap. The worker returned the expected `swam`, `went`, and length hints. This verifies the built worker, not an authenticated production editor session.

No live AI request is needed for background help. Authenticated hosted workflows and comprehensive grammar coverage are not established by these synthetic checks.
