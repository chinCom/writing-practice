# First session: sign in → choose → write → feedback → revise

Date: 2026-10-19

## What changed

### A visible first-session loop

[`FirstSessionGuide`](../../src/components/onboarding/FirstSessionGuide.tsx) is a five-step
rail — sign in, choose a task, write, read feedback, revise. Signing in is pre-completed,
so the learner starts with progress rather than at zero (endowed progress), and exactly
one step carries `aria-current="step"`. Completed steps show a check plus a
screen-reader-only "done"; meaning never relies on colour alone.

- **Today** renders the rail above the task card. The current step is derived on the
  server by [`firstSessionGuide`](../../src/lib/first-session.ts) from the learner's
  completed checks:
  - no level yet → **Choose a task** (placement)
  - no writing yet → **Write**
  - newest check not revised → **Read feedback**, with a secondary link to that saved
    feedback (`/feedback/<id>`)
  - any revision exists → the guide disappears, so it never becomes permanent furniture.
- **The first feedback page** renders the same rail with **Revise** current. The rail
  sits between the score header and the marked page, so the page's job — move to the
  revision — is stated before the corrections and repeated by the existing primary
  "Revise your writing" action.
- **Writing Studio** now states the hand-off under the Check button: after a check the
  learner sees the marked page and one priority, then revises. This is copy only; the
  check flow is unchanged.

Strings are in the new `firstSession` namespace and the `studio.nextStep` key, in both
`messages/en.json` and `messages/vi.json`.

### App Router review

Reviewed: streaming and loading boundaries, server/client boundaries, data fetching and
navigation responsiveness.

**Changed**

- `/write/[taskId]` resolved `params`, `searchParams` and the session one after another,
  then loaded the task before the draft (or feedback before saved choices). The
  independent reads now run in one `Promise.all`, with the same redirect/not-found
  handling in a named `loadOwnedTask` helper. The write route is where a first session
  spends its waiting time, so this removes avoidable serial database waits.
- The revision hand-off test was flaky under parallel workers: it clicked "Revise your
  writing" while a correction choice was still saving, so the deliberate leave warning
  intercepted the navigation and Playwright dismissed it. The spec now waits for the
  ordered choice save to settle before clicking revise. The product behaviour (warn when
  a save is in flight or failed) is unchanged.

**Findings not changed, with reasons**

- **The root layout awaits auth and locale.** `app/layout.tsx` calls `currentUser()`
  before it can choose the marketing, standalone or workspace shell, and
  `loading.tsx` boundaries live inside that layout. On a cold request the fallback
  therefore cannot paint until the session validation returns. The fix is a route
  group whose layout owns the authenticated chrome while the root layout stays static.
  That moves every route directory and is too large for this slice; it remains the
  highest-value streaming improvement.
- **Today is one owned transaction.** `loadToday` deliberately runs its sections in one
  `withUserDatabase` slot (documented in `docs/verification/today-database.md`). Adding
  `Suspense` per section would open competing transactions and was rejected. Today keeps
  one route-level `loading.tsx` and no partial streaming.
- **Progress remains the streaming model.** `ProgressReport` starts its load and passes
  the promise to the client behind `Suspense`; it is the right pattern for a slow report
  and needs no change.
- **Client boundaries are already minimal.** Today, Feedback and Studio are client
  components that receive server-derived values; no database or provider module crosses
  into the browser bundle. The new guide is a client component that receives only the
  step and an optional feedback id.
- **Prefetching is appropriate.** Every route has a `loading.tsx`, so dynamic routes are
  prefetched to their loading boundary. Sidebar/bottom navigation uses `IntentLink` to
  prefetch only on hover or focus; in-page primary actions use default `<Link>`
  prefetching. No change was needed.

## Verification

- `pnpm run check` passed: 339 tests passed, 7 opt-in skips; Prettier, type generation,
  typecheck, Oxlint and the design check all clean.
- Unit tests in `tests/first-session.test.ts` cover placement, writing, unrevised
  feedback (newest check wins), completed first loops and rail order.
- `tests/e2e/first-session.spec.ts` passed 12 checks on desktop and mobile: rail order
  and step states, placement first, Today → feedback → revise hand-off, the post-check
  promise on the writing screen, the guide ending after the first revision, and
  Vietnamese on a 390px viewport with no horizontal overflow.
- Related desktop/mobile specs passed after the change: `today-next-task`,
  `today-design`, `studio-layout`, `marked-page`, `feedback-motion`,
  `revision-handoff`, `correction-choices` (55 passed, 1 viewport-specific skip in the
  combined run before the last two first-session cases were added).
- The reported flake was reproduced on the unmodified tree before fixing the spec, so it
  is a test-timing defect rather than a regression from this slice.

## Limits

- No signed-in hosted account was exercised; the browser checks use the development
  previews and synthetic APIs.
- Vietnamese copy for the new strings has not had native-speaker review.
- The guide is descriptive, not stored: it is derived on every render and ends after the
  first revision. There is no dismiss control because it is not part of the permanent
  layout.