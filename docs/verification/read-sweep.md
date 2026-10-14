# Highlighter read

## Delivered behavior

The Writing Studio shows a yellow sweep while a writing check or saved-result lookup runs.
Measured text rectangles keep the bands aligned with wrapped lines. The bands update after font loading, resizing, and internal scrolling.
The bands do not accept pointer events or appear in the accessibility tree. They do not change the writing or represent provider progress.
Reduced-motion users keep the existing status and elapsed-time display without the sweep.
The sweep stops after completion or failure. Disabled writing remains readable during the check.

## Verification

- `npm run check`: format, TypeScript, lint, and design checks passed; 59 tests passed and two opt-in live tests skipped.
- `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' GOOGLE_AUTH_ENABLED=false npm run test:e2e -- --workers=2`: 104 passed and six intentional skips.
- `npm run build`: passed.
- `node scripts/audit-read-sweep.mjs`: four accessibility scans found zero WCAG A/AA violations. See [scan results](ux/read-sweep-accessibility.json).
- Desktop and mobile tests check unchanged text, editing lock, measured bands, responsive reflow, reduced motion, and failure cleanup.
- Reviewed screenshots under `ux/screenshots/read-sweep-*.png`. The screenshots pause the decorative bands to make their geometry inspectable.

Browser tests use synthetic responses. No paid AI calls or database changes were needed. The bands measure visible text, not off-screen text.
Changes are not committed, pushed, or deployed.
