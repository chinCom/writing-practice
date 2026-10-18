# Shared UI layer

Date: 2026-10-18

## What changed

Reusable application UI now lives in one folder, [`src/components/shared/`](../../src/components/shared/),
instead of being split between `src/components/ui/` and per-feature copies. Seven
existing primitives moved without a compatibility re-export, so every consumer imports
the canonical module and stale paths fail statically.

Four compositions cover patterns that had been repeated across screens:

- [`SectionPanel`](../../src/components/shared/SectionPanel.tsx): a `Paper` section with a
  unique heading id, linked `aria-labelledby`, shared responsive padding, a wrapping
  heading/action row and a description slot.
- [`IconBadge`](../../src/components/shared/IconBadge.tsx): decorative icon tile with the
  theme's pastel palettes and two shared sizes.
- [`EmptyState`](../../src/components/shared/EmptyState.tsx): named no-data/completed state
  with help text, optional extra content and one native action.
- [`ActionNotice`](../../src/components/shared/ActionNotice.tsx): an MUI `Alert` whose
  message/action row wraps instead of squeezing or overflowing.

A second pass widened the layer to the small elements that were copied by hand:

- [`ActionButton`](../../src/components/shared/ActionButton.tsx) and
  [`NavigationButton`](../../src/components/shared/NavigationButton.tsx) replace repeated
  `<Button component={NextLink} …>` and per-screen `variant` combinations. Three weights
  only: `primary` is `contained`, `secondary` is `outlined`, `quiet` is `text`. Callers
  keep labels, icons, handlers, disabled/loading state and `sx`.
- [`ToneChip`](../../src/components/shared/ToneChip.tsx) replaces the repeated
  `variant="tonal"` chip with a named tone rather than a color/variant pair.
- [`SectionTitle`](../../src/components/shared/SectionTitle.tsx) keeps section headings on
  the same level and scale; [`LoadingBar`](../../src/components/shared/LoadingBar.tsx)
  requires the accessible label; [`VisuallyHidden`](../../src/components/shared/VisuallyHidden.tsx)
  replaces two identical local style objects.

See the [folder README](../../src/components/shared/README.md) for when to use each
component and where feature logic must stay.

## Adoption

| Screen | Shared usage |
| --- | --- |
| Today, path, lessons, editors, Practice, Progress, Portfolio, Settings, onboarding | `PageHeader`, `WritingField`, `PageLoading` |
| Every workspace screen | `NavigationButton` for internal link-buttons and `ActionButton` for in-place actions; `ToneChip` for level/status chips; `SectionTitle` for workspace headings |
| Progress reports | `SectionPanel` for Targets, Unit benchmarks, Your improvement and Review insights; `IconBadge` on course track cards; `LoadingBar` while the report loads |
| Practice | `SectionPanel` for transfer, `EmptyState` for no-due/completed batches, `ActionNotice` for failures, shared writing field, hint text and loading bar |
| Portfolio | `EmptyState` for no matches and no saved writing, `ActionNotice` for load/session failures, shared stat tiles and visually hidden loading status |
| Settings, account and weekly goal | Shared action weights, heading and small `IconBadge`; its two-column form cards keep their own layout |
| App shell | `PageLoading` at sixteen route boundaries and `PageLoadError` in the error boundary |


Settings deliberately did not become a `SectionPanel`: its description/control
two-column grid is a different composition. It shares the palette and icon sizing, not
the report layout. The same restraint applied to Today and landing sections, which
already have named components. A shared folder is not a reason to flatten intentionally
different layouts.

## Preserved behavior

Panel copy, section order, headings and translations are unchanged. Loading, retry,
sign-in, clear-search and finish actions keep their original handlers, endpoints,
disabled states, aria state and keyboard reachability. Shared notices never retry on
their own. Buttons keep the exact MUI weight they had before (`contained` → `primary`,
`outlined` → `secondary`, default/`text` → `quiet`), and internal links remain real
anchors using Next.js client routing. Status and level chips keep their original
`variant`, color and size, including the existing warning/error treatments.
`WritingField` still forces English left-to-right writing and disables browser writing
aids; it now also forwards both supported `slotProps.htmlInput` forms and a React 19
ref. No new dependency, state library, theme token, translation key, API or route was
added. Theme files are unchanged.

## Verification

| Gate | Result |
| --- | --- |
| Shared component contracts | 12 cases cover semantic sections, generated/distinct heading ids, dark/nested heading levels, native actions, notice roles and disabled state, decorative icon treatment, input-slot forwarding, all three action weights, real navigation anchors, tonal chip palettes, loading semantics, section heading levels and hidden helper text. |
| `npm run check` | Passed: formatting, route types, TypeScript, ESLint, design rules and 296 tests; 7 opt-in tests skipped. |
| Targeted desktop/mobile Playwright | 102 passed across Today, path, lessons, feedback, Practice, Progress, Portfolio, Settings, weekly goal and writing-flow specs. After the final login/error-dialog conversions, a further 34 checks passed for sign-in and the app error dialog. |
| Shared UI browser checks | 8 cases × 2 layouts: equal panel padding, heading/id pairing, badge size, keyboard retry with no automatic replay, clear-search action, empty Portfolio link, Vietnamese dark-mode wrapping, writing safeguards, action weight plus client-side navigation, and chip/loading semantics. |
| Import audit | 37+ files consume the canonical shared modules; no stale `@/components/ui/{moved}` import remains, and no workspace screen still builds a `variant`/`color` button or a raw `variant="tonal"` chip. |
| Visual review | [Progress desktop](shared-ui/progress-desktop.png), [Progress mobile](shared-ui/progress-mobile.png), [dark Vietnamese targets](shared-ui/targets-vi-dark-mobile.png). |

The screenshots use the existing synthetic preview fixtures. They are evidence of
layout, spacing and theme behavior, not production content or a visual sign-off.

## Limits

- The folder intentionally has no barrel: `bundle-barrel-imports` still applies and
  every consumer imports a concrete module.
- Shared components do not own feature data, authorization, retry timing or
  navigation policy. Those remain in their feature hooks/components.
- No full browser suite or deployment was run for this change; the affected screens
  and the shared-boundary contract were exercised directly.
- The marketing landing page keeps its own button compositions on purpose: it uses a
  distinct visual system, custom anchor links and per-section sizing. It was not
  flattened into the workspace action vocabulary.
- A leftover development server from an earlier Playwright run caused the two
  unconfigured-Google-sign-in checks to fail once because `reuseExistingServer` reused
  a server started with real auth env. The stale server was stopped, and a fresh run
  with deliberately blank auth configuration passed all 38 affected checks.
