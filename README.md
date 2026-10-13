# Writing coach

Writing coach helps learners practice English writing. Learners can save drafts, get AI feedback, and revise their writing.

The app uses Next.js, TypeScript, MUI, Supabase, and DeepSeek. The interface supports English and Arabic.

## Requirements

- Node.js 22 or later.
- npm.
- A Supabase project for authentication and data storage.
- A DeepSeek API key for live AI feedback.

## Run locally

1. Install the dependencies.

   ```sh
   npm ci
   ```

2. Copy the example environment file.

   ```sh
   cp .env.example .env
   ```

3. Add your configuration to `.env`. Follow the setup sections below.
4. Start the development server.

   ```sh
   npm run dev
   ```

5. Open `http://127.0.0.1:3000`.

**Credential risk:** Keep `.env` private. Do not commit passwords, database connection strings, or private API keys.

## Set up Supabase

1. Create a Supabase project.
2. Set `NEXT_PUBLIC_SUPABASE_URL` to your project URL.
3. Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your publishable or anon key.
4. Set `DATABASE_URL` to your PostgreSQL pooler connection string in `.env`.
5. Apply the database migrations.

   ```sh
   npm run db:migrate
   ```

6. Keep the `writing` schema outside the Data API exposed schemas.
7. Set the Auth Site URL to your app URL.
8. Allow your app's `/auth/callback` URL in the Auth redirect settings.
9. Enable email sign-in.
10. Configure a verified SMTP sender before you offer public email sign-in.
11. To enable Google sign-in, configure a Google OAuth web client in Supabase.
12. Use the callback URL from Supabase when you configure the Google client.
13. Restart the development server after you change `.env`.

Email links must open in the browser that requested the link.

The server verifies the learner's session before each account operation. Database policies restrict access to the learner's own data.
A service-role key is not required.

The migration runner skips migrations that it has already applied. Do not edit an applied migration.

## Set up the AI coach

Set `DEEPSEEK_API_KEY` in `.env`. Keep this key on the server.
Do not use a `NEXT_PUBLIC_` prefix for private keys or `DATABASE_URL`.

The default model is `deepseek-flash`. Use `DEEPSEEK_MODEL` to change the model.
Use `DEEPSEEK_BASE_URL` to change the provider URL.

Set `USE_MOCK_LLM=true` to use sample feedback without a provider call.
The app labels sample feedback as mock. Use live feedback for production.

The app sends writing and the fixed task context to the AI coach. It does not send account identifiers.
The server validates the AI response before it stores feedback.

Free accounts can request 20 checks per UTC day. Pending and failed checks count toward this limit.

The current A2 coach uses non-thinking JSON output and a shared 45-second provider deadline.
A check saves the writing before it calls the provider. If the response is lost, the app looks for saved feedback.
The app also restores the pending check after a reload in the same browser tab.
Select **Look for my feedback** when the app cannot confirm the result. This action does not call the AI provider.
Do not edit a pending check to resubmit it. Wait for the result or failure before you start another check.

**Cost risk:** Live AI calls use paid provider tokens. A free database plan does not cover AI costs.

## Use the app

1. Open `/login` and sign in.
2. Open `/write/weekend`.
3. Write a short message for the A2 task.
4. Select **Save draft** to store your writing.
5. Select **Check my writing** to request feedback.
6. Review the corrections and suggestions.
7. Select **Explain** on a correction to see why the original needs a change and why the suggestion fits.
8. Select **Revise your writing** to try again.

Explanations use short, direct English. The coach distinguishes errors from optional improvements.
The app saves each explanation for reuse. Reopening a saved explanation does not make another AI call.
Accounts can request 60 new explanation attempts per UTC day. Failed attempts count toward this limit.

Open `/today` to return to saved feedback. Open `/settings` to change the interface language or appearance.

Development previews are available under `/dev/preview/`. These routes return 404 in production.

## Check the code

```sh
npm run format:check
npm run check
npm run test:e2e
npm run build
```

Install the test browser before the first browser test.

```sh
npx playwright install chromium
```

The default tests do not call a live AI provider. Database tests use local PostgreSQL through PGlite.
Browser tests use simulated API responses. These tests do not prove live sign-in or hosted data storage.

For tests that require an unconfigured app, stop the development server first. Then run:

```sh
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' npm run test:e2e
```

Restart the development server after the tests.

**Cost risk:** This optional test calls the live AI provider with sample writing.

```sh
npm run test:live-coach
```

To check live explanations with three synthetic corrections, run this paid test:

```sh
RUN_LIVE_EXPLANATION=true npx vitest run tests/live-explanation.test.ts
```

## Code layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Pages, API routes, and authentication routes |
| `src/components/` | Interface components |
| `src/lib/auth/` | Session verification and authentication configuration |
| `src/lib/db/` | Database schema and learner data queries |
| `src/lib/feedback/` | Feedback validation and correction matching |
| `src/lib/llm/` | AI provider integration |
| `src/lib/prompts/` | Coach prompts and prompt versions |
| `src/theme/` | Design tokens and component styles |
| `messages/` | Interface translations |
| `drizzle/` | Database migrations |
| `tests/` | Automated checks |

Use descriptive names and small components. Format code with Prettier.

## Current limits

The first task uses A2 writing with English coach explanations.
The full curriculum, learner onboarding, practice exercises, and progress charts are not available yet.
Account export, account deletion, and production abuse controls are not available yet.
Per-account check limits do not replace production abuse controls.
