# Today dashboard redesign

## Reference and scope

The desktop layout follows [`today.png`](../../today.png): a wide task card beside weekly activity, a full-width review banner, compact saved feedback, and a learning-path summary. Today uses a route-scoped sans-serif theme. Other screens keep their existing theme.

The development preview at `/dev/preview/today` supplies the reference's sample date, sessions, submissions, and learning steps. A preview notice identifies these samples. `/today` uses account data and honest empty states. The reference's Read/Practice/Write completion states are not invented for real accounts; the account summary uses saved lesson states.

Saved feedback now displays up to three recent submissions. The owner-scoped query includes each submission's task ID to resolve its title. No schema or RLS policy changed. The sidebar uses actual authentication status for Sign in or Sign out. The mobile menu exposes the same account action.

## Visual evidence

Compared screenshots with the reference at 1586 × 992. Also checked a 390 × 844 phone, Vietnamese, and dark mode. The layout follows the reference closely; this is not a pixel-identical claim. MUI icons and authentication-dependent account actions differ.

- [Desktop](ux/screenshots/today-desktop.png)
- [Mobile](ux/screenshots/today-mobile.png)
- [Vietnamese mobile](ux/screenshots/today-vietnamese-mobile.png)
- [Dark mobile](ux/screenshots/today-dark-mobile.png)

Mobile screenshots are full-page captures. The fixed bottom navigation appears at its initial viewport position in these captures.

## Verification

- `npm run check`: formatting, types, lint, design rules, and unit tests passed. 83 tests passed; five opt-in integration tests skipped.
- `npm run build`: passed.
- Full isolated Playwright suite: 148 passed; six intentional opt-in skips. The configured server's initial run had four failures because two tests require unconfigured Supabase and Google sign-in. The isolated run used empty auth/database variables and `GOOGLE_AUTH_ENABLED=false`. The normal configured development server was restored.
- `npx playwright test tests/e2e/today-design.spec.ts tests/e2e/today-progress.spec.ts`: covers action destinations, desktop proportions, empty account states, mobile account access, and Vietnamese overflow.
- `node scripts/audit-today.mjs`: zero axe violations, zero incomplete checks, and no horizontal overflow in all four configurations. Results: [today-accessibility.json](ux/today-accessibility.json).

Run the accessibility script against a development server. `BASE_URL` can override its default `http://127.0.0.1:3000`.

Browser preview checks use synthetic learner data. Live saved-account rendering and sign-out were not verified in this slice. No AI calls or database migrations were made. These changes are not deployed.
