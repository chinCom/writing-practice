# Shared UI

This is the canonical home of reusable application UI. Import individual modules
from this folder; there is no barrel and no second copy under the old UI folder.
Approved decorative assets remain in [the icon folder](../ui/icons/).

## Choose the right level

| Component | Use for | Current adoption |
| --- | --- | --- |
| [PageHeader](PageHeader.tsx) | Workspace title, explanatory subtitle and decorative paper accent | Today, path, lessons, editors, Practice, Progress, Portfolio, Settings and onboarding |
| [ActionButton](ActionButton.tsx) | In-place actions with one weight vocabulary: `primary` forward, `secondary` supporting, `quiet` recovery | Studio, lessons, feedback, Practice, Transfer, Portfolio, Settings and the error dialog |
| [NavigationButton](NavigationButton.tsx) | A `primary`/`secondary`/`quiet` button that navigates with Next.js client routing | Every workspace link-button: Today, path, lessons, feedback, revision, Practice, Progress, Portfolio, Settings, onboarding and sign-in |
| [ToneChip](ToneChip.tsx) | Soft level/status chips on the theme's tonal palettes | Today, path, lessons, task briefs, feedback, Portfolio, Settings and Progress targets |
| [SectionTitle](SectionTitle.tsx) | A section heading with the workspace level and scale | Today, Progress overview, Settings, Portfolio versions, task briefs and reading passages |
| [LoadingBar](LoadingBar.tsx) | The indeterminate progress bar with a required accessible label | Answer saving, explanations, placement and the coach status |
| [ContentSkeleton](ContentSkeleton.tsx) | MUI skeleton shapes, typography sizing, panels and an accessible loading region | Content-specific route and data fallbacks; wave animation respects reduced motion |
| [StatTilesSkeleton](StatTilesSkeleton.tsx) | Four metric tiles with the same responsive grid as loaded summaries | Portfolio and Progress |
| [VisuallyHidden](VisuallyHidden.tsx) | Text announced by assistive technology but not shown | Portfolio loading status and locked-path suffix |
| [SectionPanel](SectionPanel.tsx) | Named report/learning sections with a consistent heading, description, spacing and optional icon/action | Targets, benchmarks, improvement, review insights and transfer Practice |
| [IconBadge](IconBadge.tsx) | Decorative icons beside an accessible label, using the same sizes and theme palettes | Metric tiles, Settings and course summaries |
| [EmptyState](EmptyState.tsx) | No data, no matches or a completed batch, with help and a clear next action | Practice and Portfolio |
| [ActionNotice](ActionNotice.tsx) | A message with a wrapping native retry/sign-in/recovery action | Practice, Transfer, Portfolio and Progress |
| [StatTile](StatTile.tsx) | A number, label and optional shared icon treatment/hint | Progress and Portfolio |
| [WritingField](WritingField.tsx) | Every learner-writing input; consistent English direction and browser-assistance safeguards | Studio, drills, transfer, corrections, placement, lessons and the live demo |
| [SegmentedControl](SegmentedControl.tsx) | A MUI tab group with the existing sliding selection pill | Core/IELTS path tabs |
| [HintText](HintText.tsx) | Safe, themed emphasis within text hints | Practice |
| [PageLoading](PageLoading.tsx) | Wrap a screen-specific skeleton with the global slow-network notice | Sixteen route boundaries |
| [PageLoadError](PageLoadError.tsx) | The existing route error/retry dialog | App error boundary |

## Composition and ownership

```tsx
<SectionPanel title={t('title')} description={t('description')}>
  <FeatureSpecificContent />
</SectionPanel>

<ActionNotice
  severity="warning"
  message={t('loadError')}
  action={<ActionButton tone="quiet" onClick={reload}>{t('retry')}</ActionButton>}
/>

<ActionButton tone="primary" type="submit" disabled={!answer.trim()}>Check answer</ActionButton>
<NavigationButton href="/practice" tone="secondary">Open practice</NavigationButton>
<ToneChip label="A2" tone="primary" size="small" />

<EmptyState
  title={t('emptyTitle')}
  description={t('emptyBody')}
  action={<NavigationButton href="/write/weekend" tone="primary">{t('write')}</NavigationButton>}
/>
```

- Feature components own data, translations, permissions, retry timing, navigation
  and submission state. Shared UI does not fetch feature data or decide when to retry.
- Pass content and native MUI actions as nodes. Do not add feature flags or a generic
  configuration language for unrelated screen variants.
- `SectionPanel` defaults to an accessible `section` with a unique linked `h2` and
  visual `h3` typography. Use `headingComponent` for nested sections and `titleId` if
  an existing stable anchor is required. Titles wrap; they are not truncated.
- `IconBadge` is decorative by default. Keep its meaning in adjacent accessible
  text; never put interactive children inside it. Sizes are shared theme-spacing
  values, not separate per-page dimensions.
- The paper/box/alert wrappers expose their MUI root props, `sx` and React 19 `ref`.
  Caller styles compose after defaults and may be objects, callbacks or arrays.
- `WritingField` forwards both object and callback `slotProps.htmlInput`, then
  applies its mandatory writing safeguards. Root `ref` and MUI `inputRef` keep their
  distinct native meanings.
- Buttons come in three weights only: `primary` (one forward action), `secondary`
  (supporting), and `quiet` (retry, close, inline recovery). Do not reintroduce
  per-screen `variant`/`color` combinations. Form controls, dialogs, selects and
  tabs still use MUI directly.
- `NavigationButton` always uses Next.js client routing and renders a real anchor;
  never wrap it in a click handler that calls `router.push`.
- Keep domain-specific canvases, correction cards, charts and workflow hooks in
  their feature folders. Different desktop layouts are intentional; a Settings
  form does not need to become a report panel to share colors and icon treatment.

See [adoption and verification](../../../docs/verification/shared-ui.md) for the
scope, checks and screenshot evidence.
