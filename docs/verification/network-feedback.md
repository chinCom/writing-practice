# Connection and slow-loading feedback

The application shows a dismissible MUI notification when the browser reports an offline
connection or an application request has waited five seconds. Slow requests share one notice;
finishing one request does not hide another request that is still waiting. A resolved condition
clears the notice. A new offline episode can show a new notice after an earlier one was dismissed.

Notifications do not take keyboard focus, reload the page, retry requests, or clear writing.
The existing request headers, responses, cancellation signals, and error handling are preserved.
The complete coach/recovery workflow is tracked too, so short status polls do not hide a long wait.
The app does not add connection-probe requests or automatically repeat paid checks or saves.

Route loading fallbacks use the same five-second notice. Loading files sit alongside the account
pages so client navigation can show the fallback without waiting for the page to finish. The root
error boundary displays a localized dialog and a usable fallback page instead of technical error
details. Its retry button uses this installed Next.js version's `retry()` prop to fetch the page
again. The user can close the dialog; retry is disabled while the browser reports offline.

All copy is in English and Vietnamese message files. Toast positioning leaves space above the
mobile bottom navigation. Status messages are announced politely, and reduced-motion users get
static loading indicators and immediate notification transitions.

## Verification

- `npm run check` passed: formatting, TypeScript, ESLint, design rules, and 182 tests
  (7 opt-in tests skipped).
- Playwright passed 56 targeted desktop/mobile checks across `network-feedback`,
  `ux-interactions`, `release-blockers`, `curriculum-errors`, `weekly-goal`, and `onboarding`.
  These include all 12 new connection-feedback checks. This was not a full browser-suite run
  or a production-build check.
- Unit checks cover the five-second threshold, overlapping requests, cleanup after cancellation,
  unchanged response/options, one POST without automatic replay, and the complete waiting workflow.
- Browser checks simulate offline/reconnection, slow and fast saves, server-side page loading,
  page-error recovery with a real refetch, unchanged writing and focus, and Vietnamese dark mode.
- Regression browser checks cover existing writing recovery, save failures, profile/goal settings,
  placement, and warm-up errors with synthetic responses.
- Screenshots are in `ux/screenshots/network-*.png` and were visually inspected on desktop and mobile.

The previews at `/dev/preview/connection/{ready,slow,error}` are development-only and use synthetic
conditions. The error preview accepts the `connection_preview_ready` test cookie to verify that
retry fetches a successful server response. No learner account, database mutation, AI call, or
email is needed for these browser checks.

## Limits

The browser's online flag is a connectivity hint, not a bandwidth test. A slow service can also
cause a long wait, so the copy does not claim that the user's network is definitely at fault.
Fetch tracking measures waiting for the response; route fallbacks and the whole coach workflow
also track their mounted or active duration. Notifications require the app to have loaded.
The root route error boundary handles page errors below the layout; it does not replace the
framework's global document error fallback for a failure in the root layout itself.

The notification does not change backend timeouts, guarantee a successful save, or mark uncertain
checks as failed. Existing request-key recovery and account-only access rules remain in place.
