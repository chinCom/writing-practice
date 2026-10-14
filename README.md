# Writing coach

Writing coach helps learners practice English writing. Learners can save drafts, get AI feedback, and revise their writing.

The app uses Next.js, TypeScript, MUI, Supabase, and DeepSeek. The interface supports English and Vietnamese. AI feedback and explanations remain English.

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

Database connections have a five-second establishment limit. Statements stop after five seconds, and lock waits stop after two seconds.
Each server process uses at most three operation connections. Queue waits stop after two seconds, with at most 30 waiting operations.
An owned database operation stops after ten seconds. Its connection is destroyed before the slot returns to use.
See `docs/verification/database-deadlines.md` for network fault checks and deployment limits.

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

The writing coach uses non-thinking JSON output and a shared 45-second provider deadline.
A check saves the writing before it calls the provider. If the response is lost, the app looks for saved feedback.
The app also restores the pending check after a reload in the same browser tab.
Select **Look for my feedback** when the app cannot confirm the result. This action does not call the AI provider.
Do not edit a pending check to resubmit it. Wait for the result or failure before you start another check.

**Cost risk:** Live AI calls use paid provider tokens. A free database plan does not cover AI costs.

## Use the app

1. Open `/login` and sign in.
2. Open `/onboarding` to save your learning profile. Settings also links to this page.
3. Open `/write/weekend`.
4. Write a short message for the A2 task.
5. Select **Save draft** to store your writing.
6. Select **Check my writing** to request feedback.
7. Review the corrections and suggestions.
8. Select **Explain** on a correction to see why the original needs a change and why the suggestion fits.
9. Select **Revise your writing** to try again.

The profile saves your native language, goal, self-reported starting level, and daily study minutes.
These preferences do not choose your learning-path starting level or change English coach explanations.
Open `/placement` for an A1–B1 practice estimate, then choose a starting level.
Open `/path` for lessons, warm-ups, and writing tasks after reviewed content is published.
Warm-ups run without AI. Checkpoints require an average score of 3.5 and grammar of at least 3.
Saving stops waiting after 10 seconds. A failed save preserves your writing and lets you retry.
Browser navigation warns before leaving unsaved writing. Save important writing before closing the tab.

Explanations use short, direct English. The coach distinguishes errors from optional improvements.
The app saves each explanation for reuse. Reopening a saved explanation does not make another AI call.
Accounts can request 60 new explanation attempts per UTC day. Failed attempts count toward this limit.

Open `/today` to see writing activity, due Practice, and saved feedback.
Open `/progress` to see writing totals, UTC streaks, estimated levels, and review results by error tag.
Open `/portfolio` to reopen past writing or compare a revision with its parent version.
Open `/settings` to change the interface language or appearance.
Signed-in learners can save a weekly goal of 3, 5, or 7 sessions. Today uses the saved goal.

Apply fix changes the text immediately and selects the next open correction. Apply fix, Undo, and Dismiss suggestion save choices in an ordered background queue.
Failed saves preserve local choices and show a retry. Navigation warns while saves are pending or failed.
Dismissed suggestions leave Practice until you restore them.
Select **Report correction** to save a reason for later quality review. Reports do not change the saved AI feedback.
A decorative highlighter sweep runs during checking. Reduced-motion users see the status without the sweep.

**A little help** checks the current draft after a 500 ms typing pause. A browser Web Worker runs narrow grammar, task-length, invitation, and paragraph checks.
The panel ignores stale results and never changes the writing. These local checks do not call DeepSeek or count toward daily AI limits.
Select **Check my writing** for a full AI review. Local hints are not a complete grammar assessment.

Open `/practice` to review mistakes from saved writing. Type the corrected phrase, then select **Check answer**.
You get one retry after a wrong answer. The app saves each result and schedules the next review.
Practice checks answers without an AI call. It accepts the saved phrase with differences in case or spacing, not alternative wording.

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
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' GOOGLE_AUTH_ENABLED=false npm run test:e2e
```

Restart the development server after the tests.

To verify real database cancellation, rollback, and connection reuse without creating learner data, run:

```sh
RUN_DATABASE_DEADLINES=true node --env-file=.env node_modules/vitest/vitest.mjs run tests/database-deadlines.test.ts tests/database-network.test.ts
```

This optional check briefly uses four database connections. It makes no AI or email calls.

**Cost risk:** This optional test calls the live AI provider with sample writing.

```sh
npm run test:live-coach
```

To record the 12-case synthetic A2 evaluation pilot, run this paid command:

```sh
EVAL_LIVE=true npm run evals
```

See `evals/README.md` for scoring rules and limits. The pilot does not establish broad AI quality.

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
| `src/lib/practice.ts` | Practice question selection, answer checks, and review intervals |
| `src/lib/llm/` | AI provider integration |
| `src/lib/prompts/` | Coach prompts and prompt versions |
| `src/theme/` | Design tokens and component styles |
| `messages/` | Interface translations |
| `drizzle/` | Database migrations |
| `tests/` | Automated checks |

Use descriptive names and small components. Format code with Prettier.

## Current limits

The standalone weekend task remains available at A2. Coach explanations remain in English.
Placement estimates remain A1–B1. The learning path supports seven starting levels and a draft PRE_A1–C2 course with 21 units and 63 lessons.
Hosted lessons await teacher approval and migration `0009_writing_course.sql`.
See [curriculum review](curriculum/README.md) and [course evidence](docs/verification/writing-course.md).
The larger 15-unit-per-level curriculum, certified level exams, and nightly generated drills are not available.
Learning profiles and weekly goals are available. Broader AI evaluation and sustained-load testing remain outstanding.
Account export, account deletion, and production abuse controls are not available yet.
Per-account check limits do not replace production abuse controls.
