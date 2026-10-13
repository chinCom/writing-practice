# Writing coach

English writing practice built with Next.js, TypeScript, MUI, Supabase, and DeepSeek.

## Local development

Requires Node.js 22 or later. Verified with Node.js 24.21.0.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000.

- `/today`: full-width task card and signed-in learners' saved feedback.
- `/login`: email magic link and Google sign-in when Supabase is configured.
- `/write/weekend`: authenticated A2 writing task, draft saving, and AI check.
- `/feedback/[submissionId]`: private feedback, marked text, and revision action.
- `/settings`: local appearance and English/Arabic interface preferences.
- `/dev/preview/today`, `/dev/preview/write`, `/dev/preview/live-write`, `/dev/preview/feedback`: development-only sample screens.

Preview routes return 404 in production. Preview feedback is explicitly labeled as mock.
Account routes fail closed until Supabase is configured. No fake learner progress appears on public pages.

## Connect Supabase

The dedicated **Free** project `writing-practice` is connected in Seoul (`ap-northeast-2`).
Project reference: `fkeczvedaevjidpnjevg`. Both SQL migrations are applied.
Local `.env` holds the publishable key and private database connection. No service-role key is required.
Email sign-in is enabled. Localhost and 127.0.0.1 callback URLs are allowed.

For a new environment:

1. Create `writing-practice` on the Free plan in the approved organization. Use Seoul (`ap-northeast-2`).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and the public anon/publishable key as `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env`.
3. Add the Supabase pooler connection string as `DATABASE_URL`. Include the database password only in `.env`.
4. Run `npm run db:migrate`.
5. Keep the `writing` schema **out** of the Data API exposed schemas.
6. Set the Auth Site URL to `http://127.0.0.1:3000` for local testing.
7. Allow `http://127.0.0.1:3000/auth/callback` as an Auth redirect URL.
8. Enable email sign-in. Enable Google only after configuring its client ID, secret, and Supabase OAuth callback.
9. Restart `npm run dev`.
10. Sign in, save a draft, check writing, reopen feedback from Today, and submit a revision.

The server uses Drizzle transactions with the verified learner's identity and the `authenticated` database role.
Row-level security protects each owned table. A Supabase service-role key is not needed.
The migration runner records file hashes and skips applied migrations. Do not change an applied SQL file.

Hosted save → live AI feedback → reopen → revise passed using a disposable confirmed Auth account.
Hosted refresh-token rotation, cookie persistence, and revoked-refresh rejection are verified.
The refresh test simulates cached-session expiry; it does not wait for the access JWT to expire.
The PKCE callback is verified against a synthetic Auth transport with the real Supabase SDK.
Live magic-link delivery and the hosted PKCE exchange still need an accessible test inbox.
Google OAuth requires a client ID and secret and remains disabled in Supabase.
Magic links use PKCE: open the link in the same browser where you requested it.
See [hosted verification](docs/verification/backend.md#hosted-verification).

## AI configuration

Keep `DEEPSEEK_API_KEY` server-only. The default model is `deepseek-flash` at `https://api.deepseek.com`.
`USE_MOCK_LLM=true` explicitly selects mock feedback. Production should use `false`.

Only the learner's writing and the fixed A2 task context go to DeepSeek, not account identifiers.
Output must match the strict feedback schema. Invalid output gets one retry within a shared 60-second deadline.
A free account gets three checks per UTC day. Pending and failed checks count toward that limit.

**Cost:** Supabase Free does not make DeepSeek calls free. The following opt-in test uses paid tokens with synthetic text:

```sh
npm run test:live-coach
```

## Code layout

- `src/app/`: pages, authenticated API routes, and auth actions/callback.
- `src/components/`: small named MUI components for each screen.
- `src/components/ui/WritingField.tsx`: shared writing input with correction disabled.
- `src/lib/auth/`: Supabase SSR configuration and verified sessions.
- `src/lib/db/`: Drizzle schema, owner-scoped queries, and quota reservations.
- `src/lib/feedback/`: strict validation and correction offset matching.
- `src/lib/llm/`: server-side provider integration.
- `src/lib/prompts/`: Markdown coach prompt and version.
- `drizzle/`: SQL migrations with ownership policies.
- `src/theme/`: design tokens and MUI styles.
- `messages/`: translated interface strings.
- `tests/`: behavior, PostgreSQL isolation, provider, and browser checks.

Use descriptive names and small components. Prettier uses two-space indentation.
No subagents are used for this project.

## Checks

```sh
npm run format
npm run check
npx playwright install chromium
npm run test:e2e
npm run build
node scripts/audit-accessibility.mjs  # Requires the local dev server
```

The default test suite makes no live provider calls.
Database tests use PGlite PostgreSQL with synthetic Auth users, not a hosted Supabase project.
Browser workflow tests intercept API calls; they do not prove live sign-in or hosted persistence.
Unconfigured-environment browser checks must run without Supabase environment variables.
Stop the normal dev server, then run `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' npm run test:e2e`.
Restart the normal dev server afterward.

The opt-in hosted test requires a disposable confirmed Auth account. It uses two paid DeepSeek calls.
It does not create or delete the test account. Delete the account in Supabase after verification.

```sh
TEST_LOGIN_EMAIL=your-disposable-test-address \
TEST_LOGIN_PASSWORD_FILE=/path/to/private/password-file \
node scripts/verify-hosted.mjs
```

The hosted test saves desktop/mobile screenshots under `docs/verification/hosted/`.

The Auth-only hosted check sends no email and makes no AI calls:

```sh
TEST_LOGIN_EMAIL=your-disposable-test-address \
TEST_LOGIN_PASSWORD_FILE=/path/to/private/password-file \
node scripts/verify-hosted-auth.mjs
```

This check signs out all sessions for the disposable account. Do not use a real learner account.
It records non-secret results in `docs/verification/hosted/auth-refresh.json`.

### Remaining authentication configuration

Custom SMTP is not configured. To enable email for arbitrary recipients, provide a verified sender,
SMTP host, port, username, and password through a private credential file or the Supabase Dashboard.
Do not send credentials in chat or add them to public environment variables.
The default Supabase sender is restricted and is not a production email service.

Google sign-in needs a Google Cloud OAuth web client ID and secret. Register
`https://fkeczvedaevjidpnjevg.supabase.co/auth/v1/callback` as its authorized redirect URI.
Keep the client secret in Supabase's Google provider settings, not browser code.
Consent-screen publishing and any required domain verification remain release gates.

## Secrets and release limits

See `.env.example`. Keep `.env` private. Never prefix private API keys or `DATABASE_URL` with `NEXT_PUBLIC_`.
This slice is implemented locally, not deployed. Full curriculum, learner onboarding, native-language AI explanations,
error-bank practice, revision score comparison, correction connectors/mobile coach sheet, and production abuse controls remain deferred.

## Project references

- [Project specification and status](PROJECT.md)
- [Design specification](DESIGN.md)
- [Backend verification and screenshots](docs/verification/backend.md)
- [Earlier scaffold verification](docs/verification/scaffold.md)
