# Database deadlines

## Delivered

- Each server process has three independent, single-connection operation slots.
- The queue retains at most 30 waiting operations. Queue waits stop after two seconds.
- An owned database operation has a ten-second deadline, including connection setup, statements, and commit or rollback.
- A timed-out operation destroys its own connection before the slot becomes available again. Other slots keep their connections.
- PostgreSQL connection establishment stops waiting after five seconds.
- Statements stop after five seconds. Lock waits stop after two seconds.
- Transactions idle between statements stop after five seconds.
- Every owned transaction reapplies these PostgreSQL limits before setting the authenticated role and owner.
- API deadline failures return private HTTP 503 responses with `DATABASE_TIMEOUT` and `Retry-After: 2`.
- Responses contain no SQL, writing, account identifiers, or database addresses.
- Feedback treats a database timeout as an uncertain result. It looks up the existing request key without another paid POST.

No schema migrations or persistent test data were needed.

## Verification

Before implementation, a saturated-pool request waited until a connection became available and then succeeded. It did not enforce the queue deadline.
The regression now rejects that request while the three existing operations finish successfully.

The real hosted PostgreSQL checks verify:

- A cancelled statement rolls back and releases its advisory lock.
- A second connection holds a lock while the application lock wait times out.
- Three stalled operations occupy all slots. A queued request times out, and subsequent owned work succeeds.
- A local TCP relay cuts traffic after authentication on one established connection.
- The affected operation stops at its deadline. A simultaneous healthy operation still succeeds.
- Later work reconnects and retains the expected owner identity.

Repeat both opt-in checks with configured `.env` credentials:

```sh
RUN_DATABASE_DEADLINES=true node --env-file=.env node_modules/vitest/vitest.mjs run tests/database-deadlines.test.ts tests/database-network.test.ts
```

These checks create no learner rows and make no email or AI calls. They briefly use four database connections and run test sleep queries.
The network test cuts traffic only through its own local relay, not through the application's normal server connections.
Statement and lock evidence: `docs/verification/hosted/database-deadlines.json`.

The default suite also tests a local TCP server that never completes the PostgreSQL handshake.
It checks safe API failures and feedback recovery through a local HTTP server.

Fresh verification:

- `npm run check`: 72 tests passed; four opt-in tests skipped. Formatting, types, lint, and design checks passed.
- Both opt-in hosted database tests: passed.
- Isolated browser suite: 128 passed; six intentional skips. Browser API responses are simulated.
- `npm run build`: passed.
- `npm audit --omit=dev`: zero vulnerabilities.
- `git diff --check`: passed.

## Limits and release gates

These limits cover owned database operations, not all authentication, AI, or full-page response time.
A lost commit response can leave the client uncertain about the outcome. Feedback retains its request key for lookup rather than starting another paid check.
A terminated connection cannot force a remote database to receive a cancellation during a network partition. Server-side statement and idle-transaction limits remain active.
Server-rendered page queries do not use the API JSON error handler.
The contention checks prove recovery, not sustained-load capacity or quota correctness under racing writes.

Public abuse controls remain blocked on the deployment's trusted client-IP source and shared limiter configuration.
The approved target is Upstash Redis. An arbitrary incoming `X-Forwarded-For` header must not become a trusted identity.
Per-account daily counts and process-local database limits do not replace deployment-wide abuse controls.

The configured session pooler was tested. Other pooler modes require separate integration checks.
