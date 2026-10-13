# AI check hardening

## Scope

This slice makes **Check my writing** recoverable and limits stalled provider calls.
It also fixes the feedback-page schema mismatch reported during the changes.
No subagents were used.

## Delivered

- The current A2 coach uses non-thinking JSON output with a 2400-token cap.
- Both validation attempts share one 45-second provider deadline. SDK retries are disabled.
- Truncated output is rejected even when its JSON parses. Strict output validation remains active.
- The server reserves a check and saves its writing before it calls the provider.
- An owner-scoped request key prevents duplicate reservations and duplicate provider calls.
- A lost response triggers safe status lookups. Status lookups do not call the provider.
- The browser keeps only the request key in session storage. The same tab can recover after reload.
- Pending checks offer **Look for my feedback**. Provider failures offer **Try again** without clearing writing.
- Checks abandoned for more than two minutes become failed. Late completions cannot overwrite failed checks.
- Request bodies stop reading after 20000 bytes. All API error responses prevent caching.
- Free accounts share a 20-check allowance per UTC day. Pending and failed checks count.
- Waiting feedback includes an indeterminate progress indicator, elapsed time, and a slower-response message.

## Runtime error repair

The running code selected `request_key` and `started_at` before the hosted migration added these columns.
Applied `drizzle/0002_recoverable_checks.sql`. The migration adds columns and an index; it does not delete writing.
Repeated the original submission/feedback join under the owner's authenticated database role.
The original record remained completed, and its feedback was readable.
A second `npm run db:migrate` skipped the applied migration.

## Verification

- `npm run check`: formatting, type checks, lint, design rules, and 43 tests passed. The live-provider test is opt-in.
- `npm run test:e2e` with Supabase and Google disabled: 49 desktop/mobile checks passed; five checks were intentionally skipped.
  Four skips require configured Google. One checks the mobile menu only on mobile.
- `npm run test:live-coach`: real `deepseek-flash` feedback passed strict validation with synthetic writing.
  The run took about 3.5 seconds, including test startup. This is one observation, not a latency guarantee.
- `npm run build`: production build passed.
- The waiting-screen accessibility scan reported zero WCAG 2 A/AA violations at the mobile viewport.
- Desktop and mobile screenshots were inspected for wrapping, writing preservation, and progress visibility.

Tests cover repeated request keys, input conflicts, single-worker claims, daily quota, cross-owner status denial,
abandoned checks, provider failures, truncated output, provider deadlines, bounded request streams,
lost responses, reload recovery, pending recovery, and retained writing after failure.
The pending-recovery browser test confirms one POST even after the learner selects the recovery action.

## Visual evidence

- [Desktop waiting screen](ux/screenshots/coach-waiting-desktop.png)
- [Mobile waiting screen](ux/screenshots/coach-waiting-mobile.png)

The waiting screens use simulated pending API responses. They are not hosted AI execution evidence.
Browser workflow checks also simulate API responses. Database integration checks use actual local PostgreSQL through PGlite.
The live-provider test covers the provider directly; the hosted check covers the original feedback query and migration.
No new hosted browser sign-in or new hosted feedback submission was performed for this slice.

## Limits

The provider deadline bounds AI requests, not every possible database or network delay.
Recovery does not rerun abandoned work in a background job. A confirmed failure requires a new learner action.
Session storage recovery is limited to the same tab. Clearing browser storage removes the recovery key.
Per-account limits do not replace production abuse controls.
Non-thinking mode has sample-response evidence, not a comprehensive teaching-quality evaluation.
These changes are included in the current implementation commit. They are not pushed or deployed.
