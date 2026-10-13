# Backend and AI slice verification

## Delivered locally

- Supabase SSR email/Google sign-in, PKCE callback, sign-out, and session refresh proxy.
- Authenticated draft and feedback APIs. Request ownership fields are rejected.
- Private PostgreSQL schema with owner row-level security on drafts, submissions, feedback, and AI usage.
- Drizzle save/reopen/revision queries and serialized daily check reservations.
- DeepSeek server integration with Markdown prompt, strict output validation, one retry, and a shared 45-second deadline.
- Recoverable checks, bounded request bodies, and the current 20-check UTC daily allowance. See [AI check hardening](ai-check.md).
- Highlighted corrections, strengths-first feedback, crisis support state, rewrite, and revision action.
- Saved-feedback list and a wider Today layout. Desktop Today exceeds 1000 pixels at a 1440-pixel viewport.
- English/Arabic UI messages, Prettier formatting, and direct self-review. No subagents.

## Verification evidence

- `npm run check`: formatting, TypeScript, ESLint, design rules, and 24 behavior/integration tests passed.
- The live-provider test is skipped by default. `RUN_LIVE_COACH=true npx vitest run tests/live-coach.test.ts` passed separately after strict validation changes.
- The live check used synthetic sample writing and `deepseek-flash`. No learner text or account identity was used.
- `npm run test:e2e`: 15 checks passed on desktop/mobile Chromium; the desktop mobile-menu test was skipped intentionally.
- `npm run build` passed.
- Production smoke checks on port 3002: Today, Settings, and Login returned 200; sample routes returned 404; Write redirected to Login.
- Unconfigured feedback API returned `NOT_CONFIGURED` without calling the coach.
- `node scripts/audit-accessibility.mjs`: zero WCAG 2 A/AA and 2.1 AA violations across four routes at both viewport sizes. See [machine-readable results](backend-accessibility.json).
- `npm audit --omit=dev`: zero vulnerabilities. Full audit: four moderate and five high findings in development tooling.

### What the tests prove

PGlite runs the actual SQL migration and Drizzle queries. Tests prove owner isolation, forged-owner rejection,
anonymous denial, saved-feedback reopening, revision ownership, pending quota counting, and authenticated API behavior.
The route integration test stubs verified Auth and DeepSeek, but uses real local PostgreSQL.
Provider tests use a synthetic HTTP server for invalid JSON, retry, usage, and mock behavior.
Browser tests intercept save/check APIs and render labeled sample feedback. They prove UI navigation and responsive behavior, not hosted persistence.

### Hosted verification

Created a dedicated Supabase project on the Free plan.
The unrelated project was not changed. No paid Supabase plan or upgrade was selected.
Configured local credentials privately, applied both migrations, and kept `writing` outside the Data API exposed schemas.
Email sign-in and local callback URLs are configured. Email confirmation remains enabled.

`drizzle/0001_secure_rls_helper.sql` removes public execution of Supabase's generated automatic-RLS helper.
The regression test first reproduced the broad permission, then proved its removal and the helper-absent case.
Supabase's security advisor reported zero findings after migration.

`node scripts/verify-hosted.mjs` passed with a disposable confirmed password account:

- Verified Supabase authentication and SSR cookies.
- Saved a draft and reloaded the same writing.
- Obtained validated real `deepseek-flash` feedback through the browser and authenticated API.
- Reopened the saved feedback from Today.
- Submitted a revision and verified attempt 2 and its parent in hosted PostgreSQL.
- Verified another database identity sees no writing or feedback.
- Verified anonymous API access returns 401 and feedback pages redirect to Login.
- Captured [desktop](hosted/feedback-desktop.png) and [mobile](hosted/feedback-mobile.png) feedback.
- Deleted the disposable Auth account. Confirmed zero test users, submissions, and feedback remain.

The hosted test exposed a loopback origin mismatch: Next.js normalized 127.0.0.1 to localhost.
A failing route regression reproduced the 403. The API now compares Origin against Host and protocol;
the foreign-origin rejection test still passes.

Repeat instructions and test-account requirements are in [README](../../README.md#checks).
This verification uses password authentication only to bootstrap a disposable session; the app offers magic links and Google OAuth.

### Authentication follow-up

`tests/auth.test.ts` verifies successful callback redirects, missing/rejected codes, and cookie/header forwarding.
The cache-header test first failed because the proxy discarded the SSR SDK's `Expires` and `Pragma` headers.
The proxy now preserves the SDK headers and prevents caching private responses.

`tests/auth-pkce.test.ts` uses the real SSR/Auth SDK and a synthetic Auth HTTP transport.
It verifies the generated S256 challenge matches the browser's stored verifier, rejects a different browser,
and writes a session after the callback exchanges its code. This is not hosted email-delivery evidence.

`node scripts/verify-hosted-auth.mjs` passed against hosted Supabase with a disposable confirmed account:

- Forced refresh by changing cached `expires_at`, while retaining the legitimate session and refresh token.
- Verified hosted refresh-token rotation and a future session expiry.
- Opened authenticated writing and retained access after reload.
- Verified private cache-prevention response headers.
- Signed out globally and verified revoked refresh tokens redirect to Login.
- Deleted the disposable account and confirmed its absence in hosted PostgreSQL.

See [non-secret refresh evidence](hosted/auth-refresh.json).
The test simulates cached-session expiry; it does not wait for the signed access JWT to expire naturally.
No email or AI request was made by this check.

### Remaining credential and live-verification gates

Live magic-link email delivery and the hosted PKCE exchange need an accessible test inbox.
Google OAuth remains disabled until its client ID and secret are configured.
The Dashboard confirms custom SMTP is disabled. Public email sign-in needs a verified SMTP sender.
No provider credentials were invented, no personal password was used, and email confirmation remains enabled.
Configuration requirements are in [README](../../README.md#remaining-authentication-configuration).
No production deployment has been made.

## Visual evidence

Compared desktop (1440×1000) and mobile (390×844) captures with the supplied design boards.
The paper/ink/yellow palette and serif writing remain. Today now uses the available desktop width.
Feedback uses a marked writing panel with correction cards alongside on desktop and stacked on mobile.
Connector lines and the mobile coach sheet remain deferred; this slice is not full feedback-design parity.

- [Today desktop](../design/backend-today-desktop.png)
- [Today mobile](../design/backend-today-mobile.png)
- [Studio desktop](../design/backend-studio-desktop.png)
- [Studio mobile](../design/backend-studio-mobile.png)
- [Feedback desktop](../design/backend-feedback-desktop.png)
- [Feedback mobile](../design/backend-feedback-mobile.png)

## Release limits

Not committed or deployed. No paid Supabase plan or resource created. DeepSeek calls incur separate provider charges.
The development audit findings involve ESLint's braces chain and Drizzle Kit's esbuild chain; no unsafe automatic downgrade was applied.
ESLint 10 peer warnings remain. Resolve tooling findings before release.

The first live task is fixed to A2 with English coach explanations. Account onboarding, curriculum, error-bank practice,
revision score comparison, and production abuse controls are not delivered. Per-account daily limits do not replace IP/account-abuse controls.
The private `writing` schema must never be exposed through the Supabase Data API.
