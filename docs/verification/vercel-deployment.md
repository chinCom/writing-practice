# Vercel deployment

Deployed on 2026-10-28 through the authenticated Vercel MCP server.

- Production URL: https://writing-practice-delta.vercel.app
- Team: `ducchinhpro123s-projects` (`team_ooJVT9HqQyw5LpI2Dqmiklat`), existing Hobby plan.
- Project: `writing-practice` (`prj_3uO0CtrGiJRP6j56aEjXbeGZzut4`).
- Deployment: `dpl_4eWtaZJcQxSAoZRz1UnL8UHvxy1y`, state `READY`.
- Server region: Singapore (`sin1`); Node.js 24; pnpm 12.14.0; Next.js 16.4.2.

The deployment uses a source-file upload of the current local application, including uncommitted changes.
GitHub automatic deployments are not configured. `.env`, OAuth client secret files, local databases,
design assets outside `public/`, and supplied curriculum corpora were excluded. Private database and
AI credentials were set as encrypted Vercel environment variables. No paid hosting plan was enabled.

## Verification

- `pnpm run check`: passed; 333 unit tests passed and seven opt-in tests skipped.
- `pnpm run build`: passed locally and on Vercel.
- `pnpm run format:check` and `git diff --check`: passed.
- Explicit Playwright `tests/e2e/landing.spec.ts`, desktop and mobile, against the local production build:
  13 passed, one desktop-only check skipped on mobile.
- Public production `/`, `/login`, `/privacy`, and `/terms`: HTTP 200.
- Anonymous POST requests to feedback, explanation, and development APIs: HTTP 401.
- Production development-preview route renders Next.js's not-found response with `noindex`.
  Streaming may retain HTTP 200; preview content is unavailable.
- Missing-code auth callback returns to this site's login page.
- Google sign-in initiation returns HTTP 303, sets a PKCE verifier cookie, and uses the production callback.
- Chromium desktop and mobile: homepage and configured Google login render with no page runtime errors
  or horizontal homepage overflow.
- Vercel MCP runtime error/fatal log query: no entries during the deployment verification window.
- Hosted database: reachable; all 15 local migrations are applied with matching hashes. No migration ran.
- Explanation prompt is present in its production route's file trace.

No learner writing was submitted and no paid AI request was made during deployment verification.

## Remaining manual sign-in setup

In Supabase Auth URL Configuration, set Site URL to `https://writing-practice-delta.vercel.app`
and add `https://writing-practice-delta.vercel.app/auth/callback` to Redirect URLs, preserving localhost entries.
This dashboard action was requested from the owner and has not yet been confirmed.
The Google provider is enabled in Supabase. A completed browser sign-in and email delivery were not tested.
