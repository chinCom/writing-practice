# Release blockers and learning profiles

## Delivered

- Session refresh now covers Settings, Onboarding, Practice, Progress, Portfolio, and Revision routes.
- Browser Back warns before leaving unsaved writing. Cancel keeps the editor and its writing open.
- Recovering an older AI check warns before replacing newer, unsaved writing.
- Saving stops waiting after 10 seconds. Failure preserves writing and restores the controls.
- Revision transfer keeps oversized corrected writing visible. The learner must shorten writing before saving or checking.
- Revisions retain same-tab edits across reloads. The server reconstructs saved applied fixes without browser storage.
- Switching draft and revision URLs remounts the editor with the correct writing.
- Practice reloads the due queue after each batch. Completion appears only when no due questions remain.
- `/onboarding` saves native language, learning goal, self-reported starting level, and daily study minutes.
- Settings links to the learning profile. Profiles do not change the current A2 task or English explanations.

`drizzle/0007_profiles.sql` adds an owner-only profile table. The migration was applied to the configured hosted database.

## Verification

- `npm run check`: 64 tests passed; two opt-in live tests skipped.
- Full isolated `npm run test:e2e`: 128 passed; six intentional skips.
- `npm run build`: passed.
- `node scripts/verify-navigation.mjs`: Firefox Back cancellation preserved writing; accepted navigation left the editor.
- `node scripts/audit-onboarding.mjs`: three accessibility scans; zero violations.
- `npm audit --omit=dev`: zero vulnerabilities.
- Production HTTP checks: Today and Login returned 200; anonymous Onboarding redirected; development Onboarding and profile previews returned 404.
- Development server restored on `http://127.0.0.1:3000`.

The browser suite covers desktop and mobile Back cancellation, recovered-check cancellation, save timeout, oversized revision reload, and multi-batch Practice completion.
PGlite tests verify profile persistence, strict input validation, ownership, anonymous rejection, cross-origin rejection, and saved correction reconstruction.
Session tests verify refreshed cookies, private cache headers, and the protected-route matcher.

Screenshots: `docs/verification/ux/screenshots/onboarding-{desktop,mobile,vietnamese-mobile}.png`.
Accessibility results: `docs/verification/ux/onboarding-accessibility.json`.

## Limits and release gates

Browser API responses are synthetic. The new profile workflow has not been tested with a signed-in hosted browser.
Firefox's older-browser navigation fallback restores the editor history entry after cancellation. It can replace forward history.
Revision text remains in session storage for the current tab. Closing the tab removes unsaved revision edits.
Browsers can suppress departure dialogs without prior interaction. The warning does not replace saving a draft.
A client save timeout does not prove that the server rejected the write. Retrying saves the current draft.
Database connection, statement, and lock deadlines were added in the next slice. See [database deadline evidence](database-deadlines.md). Quota race and sustained-load tests remain outstanding.
Live email delivery, completed Google account sign-in, public abuse controls, export/deletion, and legal pages remain release gates.
See `PROJECT.md` for the remaining product milestones.
