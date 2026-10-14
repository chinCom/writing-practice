# Weekly goals

## Implemented

Signed-in learners can save 3, 5, or 7 sessions per week in Settings.
Today uses the saved goal. The ring stops at 100%, while the text shows the actual session count.
Anonymous Settings keeps the control disabled and asks the learner to sign in.
Failed saves preserve the previous value and offer retry. Expired sessions offer sign-in.
The feature makes no AI calls.

`drizzle/0006_preferences.sql` adds the owner-only preferences table.
The migration is applied to the configured hosted database.

## Verification

- `npm run check`: 60 tests passed; two opt-in live tests skipped.
- Full isolated `npm run test:e2e`: 112 passed; six intentional skips.
- `npm run build`: passed.
- `node scripts/audit-weekly-goal.mjs`: six scans, zero violations.
- PGlite tests verify persistence, defaults, owner isolation, forged-owner rejection, invalid goals, cross-origin rejection, and anonymous rejection.
- Browser tests cover save, reload, Today, failure/retry, session expiry, and anonymous controls at desktop and mobile sizes.

Screenshots: `docs/verification/ux/screenshots/weekly-goal-{settings,today-goal}-{desktop,mobile,vietnamese-mobile}.png`.
Accessibility results: `docs/verification/ux/weekly-goal-accessibility.json`.

## Limits

Browser responses are synthetic. A new signed-in hosted browser save has not been tested.
Local integration tests use real PostgreSQL through PGlite.
Daily targets and explanation language remain disabled.
The goal controls the Today display. It does not change AI limits or send reminders.
