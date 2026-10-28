# Content skeleton verification

The loading UI uses [MUI Skeleton](https://mui.com/material-ui/react-skeleton/)
with `animation="wave"`. Reduced motion disables the wave, including its
pseudo-element. Each route composes its own content layout. Static form and
overview components are shared with the loaded views to keep their dimensions
consistent.

## Page coverage

`tests/e2e/content-skeletons.spec.ts` checks every view below on desktop
(1440 × 1000) and mobile (390 × 664), using dark mode and reduced motion.

| View | Route used for verification |
| --- | --- |
| Landing | `/` |
| Sign in | `/login` |
| Today | `/dev/preview/today` |
| Learning path | `/dev/preview/path` |
| Lesson | `/dev/preview/lesson` |
| Writing editor | `/dev/preview/live-write` |
| Local writing editor | `/dev/preview/write` |
| Feedback | `/dev/preview/feedback` |
| Practice and transfer | `/dev/preview/practice-page` |
| Progress | `/dev/preview/progress` |
| Portfolio | `/dev/preview/portfolio` |
| Revision comparison | `/dev/preview/revision` |
| Settings | `/dev/preview/settings` |
| Learning profile | `/dev/preview/onboarding` |
| Placement | `/dev/preview/placement` |
| Server streaming / connection | `/dev/preview/connection/slow` |

The authenticated views use their existing development previews, which render
the same feature components with sample data. Profile and weekly goal reads are
stubbed to successful responses. Preview data requests are deliberately delayed
to cover the transition from a route skeleton to a data skeleton and then to
the populated view. No real submissions or AI calls are made by this audit.

Privacy and Terms render their static content directly. Their page navigation
and content are covered on both viewports by `tests/e2e/landing.spec.ts`.

## Assertions and evidence

- A frame sampler starts before navigation and checks every painted frame after
  the first loading region appears. A frame with neither loading content nor
  populated page content fails the test.
- Each view must display its own skeleton, replace it with the loaded view,
  preserve the viewport width, expose its loading status, and keep placeholders
  out of keyboard navigation.
- Reduced motion must leave no running skeleton animations. The separate
  Portfolio motion tests also assert that normal motion uses MUI's wave.
- The landing, sign-in, placement, learning profile, Settings, and writing task
  panel bounds are compared before and after replacement, with a one-pixel
  allowance. The editor placeholder uses the same responsive height tokens as
  the real writing canvas, and its height is compared with the loaded editor.
- Every case saves `skeleton.png`, `loaded.png`, and `layout.json` in its
  Playwright output directory. The JSON contains panel bounds and frame counts.

The root and sign-in pages accept a bounded `delay` query only in development,
so their real route fallbacks can be inspected. Existing previews accept the
same query. Production requests ignore the delay.

## Navigation

The desktop sidebar is fixed at the top, left, and bottom of the viewport, is
244 pixels wide, and has no exterior margin or rounded corners. Its close and
reopen controls have been removed. Navigation checks verify these bounds in
light and dark mode and preserve the mobile drawer controls.

Run the focused audit with:

```bash
pnpm exec playwright test tests/e2e/content-skeletons.spec.ts tests/e2e/portfolio-motion.spec.ts tests/e2e/app-navigation.spec.ts --project=desktop --project=mobile
```

The project static and unit gate is `pnpm run check`.

## Final result

All 32 page / viewport transitions passed with zero sampled blank frames.
The final focused Playwright run passed 62 checks, with four platform-specific
cases skipped. The static and unit gate passed, including 323 unit tests.
`test-results/content-skeleton-summary.md` records the per-page frame counts;
each case's directory contains its before / after screenshots and layout data.
