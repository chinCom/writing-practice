# Writing and feedback interaction audit

Audited and improved with Impeccable on 2026-10-28. Scope: Writing Studio, correction review,
explanations, self-correction, draft-save recovery, and development guidance. The existing visual
system, writing limits, owner isolation, and AI request contracts are preserved.

## Implementation integrity

Pass for the sampled flows. The interface uses the established MUI components and theme tokens.
Correction controls measured at least 44 CSS pixels high. The detector initially found one advisory
bounce easing in development guidance; the final source scan reports no deterministic findings.
There were no blocking P0 findings.

## Audit health

Scores describe the sampled flows, not whole-site certification.

| Dimension | Before | After | Evidence and limits |
| --- | ---: | ---: | --- |
| Accessibility | 2/4 | 3/4 | Focus and keyboard-scroll regressions fixed; final short-screen axe scan has zero violations. Contrast still includes manual-review results. |
| Performance | 3/4 | 3/4 | Existing split bundles and editor isolation retained; no new dependencies or live speed claim. |
| Theming | 3/4 | 3/4 | Existing tokens preserved; related dark Vietnamese feedback checks pass. Full contrast certification was outside this pass. |
| Responsive design | 2/4 | 3/4 | Short mobile sheet keeps close and correction navigation visible while its body scrolls. |
| Implementation integrity | 3/4 | 4/4 | Persistent disclosures, explicit retry controls, and motion tied to existing state changes. |
| Total | 13/20 | 16/20 | Good after the fixes; device and assistive-technology limitations remain below. |

## Findings and resolutions

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | Long explanation text had its own scroll region without keyboard access. | Explanation regions are focusable. Arrow-key scrolling is verified on desktop and mobile layouts. |
| P2 | The Explain button disappeared when its response arrived, losing keyboard focus. | Keep one stable disclosure button through loading and completion; expose expanded/busy state; allow hiding and reopening cached text without another request. |
| P2 | Opening Try it yourself left focus on its trigger and did not connect validation feedback to the answer field. | Focus the field after the reveal; expose expanded state, invalid input, and helper text. Escape closes the exercise and returns focus without closing the mobile sheet. |
| P2 | Reading a long explanation on a short screen could scroll Close correction out of view. | Scroll the correction body independently, with header and Previous/Next controls outside it. Failed background-save notices stay inside the scrolling body. |
| P2 | Draft-save failure gave no direct retry beside the message or focused recovery target. | Focus the error, offer Retry saving draft, retain the text, announce Saving, and return focus to writing after a successful save. |
| P3 | The development question used bounce easing and a longer entrance. | Use a short settling transition; preserve the existing passage-highlighter sequence and reduced-motion path. |

Relevant implementation: `src/components/feedback/CorrectionCard.tsx`, `ExplanationPanel.tsx`,
`FeedbackView.tsx`, and `src/components/studio/LiveStudio.tsx`, `DevelopmentSuggestion.tsx`.
New copy is translated in both interface languages. The generated Impeccable hook cache is excluded
from Prettier because the hook rewrites it during edits.

## Verification

The initial interaction regression run reproduced the explanation, self-correction, and save-recovery
problems on both viewports. A separate long-explanation check reproduced the mobile header problem.
The rendered axe audit also caught the keyboard-scroll issue before its fix.

- `pnpm run check`: 333 tests passed, seven opt-in tests skipped; formatting, types, lint, and design checks pass.
- Explicit related browser specs: `develop-writing`, `explanation`, `feedback-motion`,
  `marked-page`, `marked-page-accessibility`, `marked-page-keyboard`, `writing-check`, and
  `writing-feedback-interactions`: 50 passed, two viewport skips before adding the keyboard-scroll case.
- The final interaction spec adds keyboard scrolling and verifies both viewports.
  Together with `correction-choices.spec.ts`, the final pass has 19 passing checks and one viewport skip,
  including saved-choice failures and report recovery after the sheet change.
- `pnpm run test:journey`: the synthetic lesson → writing → revision → practice → returning progress flow passed.
- `pnpm run build`: passed locally and on Vercel.
- Next.js MCP: no compilation issues, config errors, or browser-session errors in the final dev check.
- Impeccable detector: no final source findings in Studio or Feedback.
- Final short-screen axe scan: zero violations; two incomplete checks remain for manual assessment.
- [Short mobile correction sheet](writing-feedback-flows/mobile-correction.png),
  [desktop correction panel](writing-feedback-flows/desktop-correction.png), and
  [accessibility output](writing-feedback-flows/accessibility.json).

Preview content, network responses, and learner-journey services are synthetic. No learner writing
or paid AI request was used. Browser coverage uses Chromium with desktop/mobile viewport emulation,
not physical phones or a screen reader. The virtual keyboard, iOS Safari touch gestures, and all
contrast combinations were not certified. Layout emulation does not prove physical touch behavior.

The one Next.js dev lock prevented the first journey-server startup while the audit server was open.
Stopping the audit server allowed the journey to run normally. A keyboard regression test also
needed to wait until the saved-choice load enabled its control before attempting focus; no timeout
or arbitrary delay was added to hide that readiness condition.

## Production deployment

Published through Vercel MCP to the existing Hobby project, with existing production environment
variables preserved. Deployment `dpl_CxrV9MwD24sGJC4MgogqAQ36e9iG` reached `READY` and is assigned
to https://writing-practice-delta.vercel.app. The local development server was restored on port 3000.
