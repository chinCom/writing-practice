# Saved correction choices

## Delivered behavior

- Apply fix and Undo save an owner-only correction choice. They do not change the saved original or AI feedback.
- Dismiss suggestion removes the correction from Practice. Restore suggestion makes the existing review available again.
- Applied and dismissed words remain selectable. Learners can reopen the correction and undo their choice.
- Report correction saves a fixed reason for the selected correction. The dialog preserves the selected reason after a failed request.
- Failed saving leaves the writing unchanged and offers an explicit retry. Successful choices survive reload.
- Reports support later quality review. They do not automatically change AI feedback or guarantee an administrator response.

## Verification

- `npm run check`: formatting, TypeScript, lint, and design checks passed; 59 tests passed, two opt-in live tests skipped.
- `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' GOOGLE_AUTH_ENABLED=false npm run test:e2e -- --workers=2`: 100 passed, six intentional skips.
- `npm run build`: passed.
- `node scripts/audit-correction-choices.mjs`: six accessibility scans found zero WCAG A/AA violations. Contrast and modal checks can remain inconclusive. See [scan results](ux/correction-choices-accessibility.json).
- Reviewed desktop, mobile, and Vietnamese dark-mode screenshots under `ux/screenshots/correction-choices-*.png` and `correction-report-*.png`.

PostgreSQL integration tests exercise real RLS, save/load/replay, report replacement, invalid correction indices, forged owners, foreign origins, missing sessions, and dismissed review restoration. Browser tests use synthetic API responses. They do not prove a new hosted signed-in correction workflow.

Migration `0005_correction_choices.sql` is applied to the configured hosted database. Read-only inspection confirmed RLS and owner policies on both new tables. No learner data was deleted. No paid AI calls were made in this slice. Changes are not committed, pushed, or deployed.
