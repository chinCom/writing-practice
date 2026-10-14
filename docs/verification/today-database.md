# Today database queue regression

## Cause and fix

Today started five owner-scoped database transactions in parallel. The application permits three active database operations and a two-second queue wait. On a cold or slow connection, the two remaining sections could time out before the first sections released their slots. The rejected `Promise.all` then failed the whole page.

Today now loads its sections through one `withUserDatabase` transaction. Existing section loaders retain their individual public interfaces. They share transaction-level query helpers with the Today loader.

The three-slot limit, two-second queue deadline, ten-second operation deadline, statement limits, and owner-scoped database role remain unchanged. Practice seeding runs last to reduce the time its per-learner advisory lock stays held.

A second reported failure was `55P03: canceling statement due to lock timeout`. Practice loading used a blocking advisory lock shared with writing reservations, explanation reservations, correction choices, and Practice answer saves. Even a dashboard read could wait behind those operations and fail after two seconds.

Practice loading now uses `pg_try_advisory_xact_lock`. When the lock is busy, it skips optional seeding and reads existing committed reviews. Newly generated drills can appear on the next load after the lock becomes available. Answer saves and other writes retain their blocking locks, concurrency safeguards, and existing deadlines. No schema changes or longer timeouts are required.

## Verification

- `tests/today-database.test.ts` exercises the actual Today server page, application pool, query helpers, and local PostgreSQL row policies. Only database transport and authentication are simulated.
- The transport takes 2.1 seconds to start a healthy transaction. Before the fix, both tests failed with `DATABASE_TIMEOUT` at the queue timer in `src/lib/db/client.ts:43`.
- After the fix, Today returns the correct saved submission, weekly goal, and progress. A second learner receives only that learner's saved submission and weekly goal.
- The full local check passed: 85 tests passed, with live integration tests intentionally skipped.
- Twelve focused desktop/mobile Today browser tests passed. These use development previews, not hosted account sessions.
- A new opt-in hosted regression holds the learner write lock in an independent transaction while loading Today and Practice. Before the fix, it reproduced the same `55P03` error. After the fix, both loaders completed while the lock remained held, and Today also loaded after release. The test uses a random synthetic owner and creates no learner rows.
- The current local check passes 87 tests, with seven opt-in checks skipped.
- The opt-in hosted loader test passed against the configured Supabase database. The final observed load took 3,889 ms. It used a random synthetic owner, created no learner rows, and made no AI calls.

Repeat the local regression:

```sh
npx vitest run tests/today-database.test.ts
```

Repeat the hosted loader check:

```sh
RUN_DATABASE_DEADLINES=true node --env-file=.env node_modules/vitest/vitest.mjs run tests/today-live.test.ts --reporter=verbose
```

## Limits

This fixes self-induced queue saturation during one Today load. It does not remove bounded failure under concurrent request saturation, database outages, or unusually large learner histories. The hosted check proves database loading, not the user's authenticated browser session. Reload `/today` to confirm the reported session also recovers.
