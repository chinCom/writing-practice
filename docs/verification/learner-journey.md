# Local learner journey verification

Verified on 16 October 2026 with `npm run test:journey` (desktop Chromium,
Growth Targets enabled inside the test environment). This exercises the real Next.js
pages, API handlers, Supabase cookie adapter, postgres-js connection driver,
Drizzle transactions, application migrations and row-level security against an
isolated PGlite database. No browser API responses are intercepted.

The learner starts signed in and placed at A1. The test opens the learning path
and its first A1 lesson, reads the model, selects the noticing spans and completes
three warm-ups. After a reload, it opens writing, saves a synthetic draft, reloads
and confirms that draft. It submits writing, reviews the hidden-answer target
hint, writes and submits a self-revision, then answers a new-sentence exercise and
a correction review (one incorrect attempt followed by a correct retry).

A fresh browser context with only the login cookies confirms:

- Two saved writing sessions, one completed correct review and one completed lesson.
- The revised writing is available at its saved feedback URL.
- The next lesson is accessible and offered on the progress screen.
- The completed new-sentence exercise is absent from the due queue.
- The correction queue is empty and its next review is scheduled for the next day.
- Exactly two requests reached the local synthetic grading service; no browser
  exceptions or failing application API responses occurred.

The run found and fixed a failure saving new-sentence practice: a raw SQL update
passed a JavaScript `Date` directly to postgres-js. Serialising that parameter as
an ISO timestamp fixes the driver error. The browser regression exercises this
through the actual answer endpoint; the previous PGlite ORM tests accepted the
unencoded date and missed the failure.

Run `npm run test:journey` to repeat. It starts disposable services on loopback
ports 3100, 4319 and 54329 and stops them after the run. It needs the Playwright
Chromium browser (`npx playwright install chromium` if absent). It uses the
repository's growth curriculum and pre-seeds a synthetic learner's placement;
it does not seed or modify a hosted database. The synthetic Auth and grading
HTTP services receive explicitly overridden local credentials and URLs.
Screenshots and the HTML report are in ignored `test-results/` and
`playwright-report/journey/` directories.

This establishes local integration and persistence across page reloads and a
fresh browser session. It does not verify hosted sign-in, deployment, model
accuracy, a real learner's experience or long-term learning gains. Synthetic
grading is recorded with model `journey-fixture` only in the disposable database.
The production Growth Targets default and M3 status are unchanged.

Validation: the final browser run passed (one journey, 18.9 seconds including
service startup). `npm run check` passed formatting, types, lint and design checks,
with 190 tests passed and 7 skipped. The focused curriculum and transfer suite
also passed all 9 tests. No paid provider calls or hosted writes were made.
