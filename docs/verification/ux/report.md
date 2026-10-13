# Learner journey review

Scope: local app at http://127.0.0.1:3000. Desktop 1440×1000 and mobile 390×844. No subagents. Google is now configured; email delivery configuration remains separate.

## Findings before fixes

1. **High — Google sign-in leaves the app on a raw provider error.** Open Today → Start writing → Continue with Google. Result: `Unsupported provider: provider is not enabled`. Evidence: `videos/google-unavailable.webm`, `screenshots/google-step-1.png`, `screenshots/google-step-2.png`. Root cause: the button checks Supabase configuration, not Google availability.
2. **High — unsaved writing can disappear during navigation.** Open the live editor preview, type a message, then follow another navigation link. No warning protects the unsaved text. Evidence: `videos/unsaved-draft-loss.webm`, `screenshots/draft-step-2.png`. Preview navigation also switches to a different sample editor. Automated regression will use the same live editor on return.
3. **Medium — privacy and unavailable-page text describes an obsolete scaffold.** Settings claims there is no account connection. Practice claims AI feedback is not connected. Evidence: `screenshots/settings-before.png`, `screenshots/practice-before.png`.
4. **Medium — explanation-language and goal settings imply working features.** The controls save preferences but the coach and progress do not use them. Evidence: `screenshots/settings-before.png`.
5. **Medium — feedback highlights do not connect to correction notes.** A learner must match highlighted words to notes manually. Highlights are not keyboard controls. Evidence: `screenshots/feedback-mobile-before.png`.
6. **Low — editor lacks a page heading and feedback navigation loses the Writing Studio selection.** The editor starts with a level-three heading. Evidence: `screenshots/editor-mobile-before.png`, `screenshots/feedback-mobile-before.png`.

## Verification status

All six findings have local fixes and passing browser regressions. The editor also restores the cursor after phrase insertion and disables phrase insertion while checking. Reload cancellation preserves unsaved writing.

The user reported a Firefox `Error in input stream` before Google account selection. A failing Firefox regression reproduced the error: assigning an external URL while the server-action response was streaming interrupted that stream. Google now uses a normal POST form at `/auth/google`, followed by a 303 redirect. The route validates the form origin and preserves the SDK's browser-bound PKCE cookie. Email links still use the existing server action.

The sign-in button now includes Google's multicolor logo, sourced from https://developers.google.com/identity/images/g-logo.png and served locally as `public/brand/google-g.png`. Reviewed screenshots: `screenshots/google-login-desktop-after.png` and `screenshots/google-login-mobile-after.png`.

Verified commands:

- `npm run check`: formatting, TypeScript, lint, design checks, 30 tests passed; one paid live-coach test skipped.
- `npm run test:e2e`: 41 passed, five intentional skips. Run with empty public Supabase variables and Google disabled to verify unconfigured behavior safely.
- `RUN_GOOGLE_SIGNIN=true npx playwright test tests/e2e/google-signin.spec.ts`: three passed, one duplicate mobile Firefox check skipped. Requires the configured local dev server. Firefox reaches the real Google sign-in page without page errors on both `localhost` and `127.0.0.1`. No account was selected in this check.
- `npm run build`: passed.

Editor save, quota, session-expiry, and feedback responses are synthetic in the repeatable browser tests. Hosted database, AI, and PKCE evidence remains separate in the backend verification report. The normal configured dev server was restored after testing. No deployment or commit was performed.
