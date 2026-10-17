# Visual fidelity verification — 2026-10-17

The reference is the eight PNGs in `design/`. Captures use Chromium through Playwright, device scale factor 1, light mode, reduced motion, loaded local fonts, and `fullPage: true`. Only the Next.js development toolbar is hidden. Studio gets a sample draft through the live editor; no AI check or authentication action is submitted.

## Exact viewport sizes

| Screen | Reference PNG suffix | Viewport | Final capture |
| --- | --- | --- | --- |
| Today | `08_27_47 AM-1` | 1448 × 1086 | [Today](final/today.png) |
| Login | `08_27_49 AM-2` | 1448 × 1086 | [Login](final/login.png) |
| Studio | `08_27_50 AM-3` | 1448 × 1086 | [Studio](final/studio.png) |
| Progress | `08_27_51 AM-4` | 1448 × 1086 | [Progress](final/progress.png) |
| Portfolio | `08_28_02 AM-1` | 1586 × 992 | [Portfolio](final/portfolio.png) |
| Settings | `08_28_05 AM-2` | 1586 × 992 | [Settings](final/settings.png) |
| Practice | `08_28_06 AM-3` | 1586 × 992 | [Practice](final/practice.png) |
| Landing | `WriteRight_ Better Writing Starts Here` | 873 × 1801 | [Landing](final/landing.png) |

Every full-page PNG has the reference's exact width. PNG heights include all live page content; they are not cropped to the reference image's height. `viewports.json` in each directory records viewport dimensions and horizontal overflow results.

## Screenshot-driven correction passes

1. **Baseline → pass-1:** visually compared the original implementation against the references. Replaced the generic overlapping paper/tick motif with separate single-sheet, travel, pen, stack, crown and chart illustrations. Added the local Caveat handwriting font, background ribbons and consistent outline navigation icons. Reduced the oversized corners and shadows. Captured all eight pages again.
2. **Pass-1 → pass-2:** screenshots exposed the sidebar touching the window edge, overly strong ribbons and an oversized landing layout. Corrected the sidebar inset and row spacing, lightened the background, adjusted header placement, introduced the reference's colored Settings/Progress icons, and reduced landing typography and component spacing. Captured and visually inspected the next set.
3. **Pass-2 → pass-3:** moved header paper left to the reference position; added amber corner ribbons and the Practice review paper stack; separated Practice progress, question, help and quick-check panels; refined the open book, people, sparkle, check and chart glyphs; corrected dashed step arrows and landing proportions. Captured and compared the third set.
4. **Final refinements:** moved Today learning navigation into the card header, restored Progress title icons beside the small illustrations, placed the Settings crown drawing above its text, and refined Login spacing and handwritten arrows. Kept the landing demo input unobscured while tightening its suggestion card. Captured all eight final full pages and additional mobile/dark/Vietnamese states.

Baseline and all three correction rounds are retained in `baseline/`, `pass-1/`, `pass-2/` and `pass-3/`. Reproduce the exact-width captures with a running local server:

```sh
node docs/verification/visual-fidelity/capture.mjs final
```

## Verification

- `npm run format` and `npm run check` passed: formatting, generated route types, TypeScript, ESLint, design rules, and **200 unit tests** (7 skipped).
- Navigation, landing, Today design, Practice and live-hint browser suites: **47 passed**, 5 skipped across desktop and mobile.
- Landing browser tests repeated after final demo layout changes: **13 passed**; 5 skipped including opt-in Google OAuth tests.
- Extra full-page screenshots: Today, Login and landing at 390px; dark Settings; Vietnamese Practice. All report no horizontal overflow. The landing editor center is unobscured at 873px. See [smoke results](final/smoke.json).

## Remaining visual differences

The SVG drawings reconstruct the raster reference motifs; they are not the original illustration assets. Noto Sans/Literata remain the site's existing UI/serif fonts. Live text, account identity, dates, task length, progress and portfolio entries differ from the mockups. Existing unavailable settings stay disabled and the preview sign-in warning remains visible. Progress/Practice retain their additional working sections, and landing retains its editable demo and legal footer, so full-page heights differ. This is a visual fidelity improvement, not a pixel-identical copy of the reference data or artwork.
