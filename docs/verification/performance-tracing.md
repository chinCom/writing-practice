# Web Vitals, request tracing, streaming, and editor rendering

## Scope

There is no deployed production URL. These results come from a local **production profiling build**, Chromium, synthetic authenticated accounts, and a PGlite PostgreSQL fixture. They are lab measurements, not production p75 Core Web Vitals. The existing Firefox session was requested but the browser connector exposed no browsers, so it could not be inspected. No Firefox profile, cookies, or credentials were copied.

The hosted database diagnostics are separate, read-only measurements from this workstation. They do not establish the response time of a deployed app or a signed-in user's auth request.

## Measured results

Medians of three matched runs per route/device:

| Measurement | Before | After |
| --- | ---: | ---: |
| Mobile editor render work, 61 typed characters | 669ms | 395ms |
| Task-brief renders during that sample | 65 | 0 |
| Mobile editor INP | 40ms | 24ms |
| Mobile Progress report-ready scenario | 1,454ms | 1,367ms |
| Desktop Progress report-ready scenario | 381ms | 384ms |
| Initial browser Progress API requests | 1 | 0 |

Final lab Web Vitals medians:

| Route/device | LCP | INP | CLS |
| --- | ---: | ---: | ---: |
| Progress / desktop | 164ms | 16ms | 0 |
| Progress / mobile simulation | 608ms | 8ms | 0 |
| Editor / desktop | 96ms | 24ms | 0.00004 |
| Editor / mobile simulation | 192ms | 24ms | 0 |

LCP did not improve everywhere: Progress increased from 92ms to 164ms on desktop and 224ms to 608ms on the mobile simulation. Desktop report-ready timing was essentially unchanged. These results support the editor rendering and request-count improvements, not a claim that every loading metric improved.

Hosted `SELECT 1` diagnostics measured 965ms for connection plus first query and 121–122ms for warm queries. This is workstation-to-database latency. The app's local diagnostic traces show no sustained pool contention in the fixture workload; that does not establish production capacity or authenticated Supabase network latency.

## Changes

- `/progress` starts its database work on the server after authentication and streams a promise result through the React component payload. The client downloads its report module alongside that promise and keeps the existing wave skeleton visible until both are ready. The initial report requires no `/api/progress` browser request. Failed initial loads show the existing retry view; retry and session-expiry handling still use the private API.
- The core and IELTS course paths now share four database reads and one content validation pass within the same owner-scoped transaction. This removes four duplicate queries while retaining both tracks and the existing RLS setup.
- Navigation links prefetch on hover or keyboard focus. This avoids speculative authentication for every visible navigation item. The normal Next.js link implementation still handles routing and cache behavior.
- Memoized task briefs receive stable phrase-insertion callbacks. The callback reads the current textarea value and selection when clicked, so typing no longer renders the static brief. Busy-state changes and changed tasks still update it.
- Progress plots have independent lazy/Suspense boundaries with their exact 260px or 300px height. Reports without chart data avoid downloading the chart renderer. Motion subscriptions live in the plots rather than rerendering the entire report after hydration.
- An initial implementation server-rendered the full report. It displayed data sooner but introduced a 270–400ms cold mobile interaction delay. Extra header/section boundaries did not solve that and were removed. The retained implementation streams the data into the small existing client loader, avoiding that large report hydration pass.
- Opt-in Web Vitals report to a same-origin endpoint and structured server logs. Dynamic route IDs, queries, fragments, learner text, account IDs, and referrers are excluded from the payload. The collector validates its fields, rejects foreign origins, skips auth/database access, and returns `private, no-store` responses.
- OpenTelemetry spans measure `auth.getUser.proxy`, `auth.getUser.render`, `database.pool.acquire`, `database.transaction`, `progress.history`, `progress.courses`, `progress.targets`, and `progress.load`. The SDK is initialized only when tracing is configured, keeping its context/export machinery out of the default request path. The optional stdout exporter emits only fixed operation names, timing/status, and trace/span IDs. The Progress retry API also exposes auth and database durations in `Server-Timing`.

## Reproduce the lab benchmark

Use a separate terminal for the fixture. Do not run CPU-heavy tests or builds during measurements. The profiling build is necessary for React render durations; it has overhead and should not be the normal release build.

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4319 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=journey-public-key \
pnpm exec next build --profile

JOURNEY_APP_MODE=production PERFORMANCE_LOGS=true \
PERFORMANCE_TELEMETRY=true PERFORMANCE_SAMPLE_RATE=1 \
node --import tsx tests/journey/server.ts > /tmp/writing-performance.log 2>&1
```

Then, in another terminal:

```sh
pnpm performance:measure /tmp/writing-lab.json 3
pnpm performance:report /tmp/writing-performance.log
pnpm performance:test
```

The benchmark uses fresh browser contexts, a local network, 1× desktop CPU and 4× mobile CPU slowdown. It uses Next.js's bundled web-vitals implementation, a fixed 61-character typing sample, and the React profiling build's DevTools commit hook. It finalizes observers with a synthetic visibility change. Progress `readyMs` ends after its report is visible and its title is clicked; editor `readyMs` includes the typing sample, so it is not an editor page-load time. Compare the render duration separately. The final before/after speed comparison has `PERFORMANCE_LOGS=false` and `PERFORMANCE_TELEMETRY=false`, matching the baseline's lack of telemetry; server traces are collected in a separate run with diagnostics enabled.

Raw before/after samples, server timing summaries, and hosted diagnostics are recorded in [performance-measurements.json](./performance-measurements.json). Three runs per route/device support a repeatable local comparison, not a statistically reliable field percentile.

To repeat hosted diagnostics without reading learner rows:

```sh
node --env-file=.env scripts/measure-database.mjs /tmp/writing-database-timings.json
```

This performs five `SELECT 1` calls and reads aggregate `pg_stat_statements` timings without exporting SQL text or parameters. Historical statements are not automatically attributable to a current screen. The slowest historical entry contains `pg_sleep` from deadline testing and is explicitly marked as an artificial delay.

## Enable real user measurements after deployment

Set these runtime environment variables and restart the app:

```dotenv
PERFORMANCE_TELEMETRY=true
PERFORMANCE_SAMPLE_RATE=0.1
PERFORMANCE_LOGS=true
```

Web Vitals are sampled for 10% of document loads; collection is disabled by default. `PERFORMANCE_LOGS` exports all custom server spans when enabled. For retained distributed traces, configure an owned OpenTelemetry collector using `OTEL_EXPORTER_OTLP_ENDPOINT` and the collector's normal authentication/export settings. No external collector was configured for this work.

Capture structured stdout through the deployment's logging service or a local log file. `pnpm performance:report path/to/server.log` groups server durations and deduplicates repeated vital updates by metric ID/name before calculating p50/p75/p95. Browser view IDs are ephemeral and not linked to server traces or user identities. Server trace IDs connect the database phases of an individual render; Proxy and server rendering may have separate trace roots.

Use production samples by route and device before setting budgets. This work does not populate a production dashboard or claim field metrics before deployment.

## Verification

- Formatting, types, lint, design rules, 332 passing unit tests (7 skipped), and a normal production build passed.
- Production desktop/mobile checks: the server data stream completes while external JavaScript is held; the wave skeleton remains until hydration is released; the report then loads with no Progress API round trip. Prefetch on keyboard intent and the emitted vitals' allowlisted fields are verified too.
- Unit regressions cover owner isolation, shared course reads, auth render-cache isolation, database recovery, telemetry validation, and streamed-load failure/retry selection.
- Relevant desktop/mobile browser specs passed: 93 tests, 5 viewport skips. They cover navigation, writing, phrase insertion and cursor restoration, disabled editing while checking, development guidance, and Progress motion/data/errors. All 16 loading handoffs were verified on both viewports: 32 handoffs, 9,080 sampled frames, zero blank frames.
- All 4 production performance checks passed on desktop/mobile. The synthetic learner journey also passed against the production build.
- Test configurations now use separate artifact directories: a concurrent journey run previously removed another run's trace files through Playwright's default output cleanup. Affected browser checks were repeated after separating the directories.

## References

- [Core Web Vitals and field versus lab measurement](https://web.dev/articles/vitals)
- [Next.js streaming](https://nextjs.org/docs/app/guides/streaming)
- [Next.js prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [Next.js Web Vitals reporting](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
- [Next.js OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry)
- [Supabase observability](https://supabase.com/docs/guides/observability)
- [MUI media-query hydration behavior](https://mui.com/material-ui/react-use-media-query/)

Version-matched framework docs were read under `node_modules/next/dist/docs/` before implementation. The web-perf, vercel-react-best-practices, Supabase, and Supabase Postgres skills guided the work.
