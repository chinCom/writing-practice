# Behavior-preserving refactoring results

## Scope and completion criteria

This work follows the risk-based backlog from the repository assessment. The aim is
clearer responsibility boundaries and directly testable rules, not replacing the stack
or changing every file. Each slice preserves public behavior and is verified before
the next starts. All changes remain local and uncommitted.

| Slice | Responsibility boundary | Evidence |
| --- | --- | --- |
| 1. Writing checks | [`useWritingCheck`](../src/components/studio/useWritingCheck.ts) owns request keys, check/recovery state and feedback navigation; the editor owns drafts and layout. | [Writing-check verification](verification/writing-check-refactor.md) |
| 2. Submission lifecycle | [`checkSubmission`](../src/lib/feedback/check-submission.ts) owns reservation/replay/claim/grading/completion/cleanup; the route owns authentication, validation and HTTP. | [Orchestration verification](verification/submission-orchestration-refactor.md) |
| 3. Domain/persistence contracts | [`DomainError`](../src/lib/domain-error.ts) carries reasons without HTTP statuses; [`AiResult`](../src/lib/ai-result.ts) decouples persistence from provider implementations. | [Boundary verification](verification/domain-boundary-refactor.md) |
| 4. Feedback review | [`useFeedbackReview`](../src/components/feedback/useFeedbackReview.ts) owns interaction state; [pure review rules](../src/lib/feedback/review.ts) determine visibility and selection. Desktop/mobile presentation shares action wiring. | [Feedback verification](verification/feedback-review-refactor.md) |
| 5. AI completion transport | [Shared client](../src/lib/llm/client.ts) owns transport, usage and one invalid-output retry. Feature adapters retain prompts, validation, budgets, thinking modes and deadlines. | [AI verification](verification/ai-transport-refactor.md) |
| 6. Curriculum | [Placement persistence](../src/lib/db/placement.ts) is separate from lesson/path access; [completion evidence](../src/lib/lesson-completion.ts) is separate from ordered unlock policy. | [Curriculum verification](verification/curriculum-refactor.md) |
| 7. Practice | [`usePracticeSession`](../src/components/practice/usePracticeSession.ts) owns the due queue, immutable answer retries and batch refresh; the view retains rendering and animation. | [Practice verification](verification/practice-session-refactor.md) |
| 8. Shared UI | [`src/components/shared/`](../src/components/shared/) owns reusable presentation primitives and compositions; feature folders keep their data, policy and distinctive layouts. | [Shared UI verification](verification/shared-ui.md) |

## Architectural guardrails

- The [existing lint gate](../eslint.config.mjs) rejects database imports from HTTP,
  Next.js and provider adapters while retaining the existing UI restrictions.
- Shared result contracts contain types, not provider or database implementations.
- Application operations receive verified ownership and validated input from their
  route/page boundaries. They do not replace authentication or row-level security.
- Provider calls remain outside short owner-isolated database transactions.
- There are no new dependencies, services, state libraries, schemas or migrations.

## Final review

The cumulative diff was reviewed for ordering, replay, cleanup, error and redirect
semantics. Static import/export analysis parsed 224 source files, including type
imports, and detected no internal static dependency cycles. Database schema, migrations,
authentication implementation, connection/deadline logic, prompts, translations,
theme, package manifest and lockfile were verified unchanged.

The review also examined the other large/high-churn areas. Today and Settings already
have named view sections; Progress already delegates report sections and pure summary
rules. Landing/theme size alone did not justify behavior-risking churn. These were
left intact. This is not a claim that no future refactoring opportunity exists.

## Final verification — 2026-10-18

| Gate | Final result |
| --- | --- |
| `npm run check` | Passed: 284 tests; 7 opt-in tests skipped. Formatting, route types, TypeScript, lint and design rules passed. |
| Full desktop/mobile Playwright suite | Passed: 325 tests; 11 opt-in/viewport-specific cases skipped. No failures or automatic retries. |
| `npm run test:journey` | Passed: one integrated synthetic learner journey, including saved drafts, two grading calls, revision, Practice and persisted progression. |
| `npm run build` | Passed: compilation, TypeScript and page generation. |
| Production prompt traces | Feedback, explanation, development and placement prompts are included in their built server artifacts. |
| Static import/export graph | 224 source files parsed; no internal static cycles, including type imports. |
| Sensitive-contract diff and whitespace review | Passed; schemas, migrations, connection logic, prompts, auth implementation, theme, translations and dependencies unchanged. |

The full browser run deliberately disables auth configuration in its test server so
unconfigured-sign-in/fail-closed cases are deterministic. It does not change the
working environment file. The separate learner journey supplies its own local auth,
PostgreSQL and grading services.

```sh
npm run check
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' DATABASE_URL='' GOOGLE_AUTH_ENABLED=false npx playwright test --project=desktop --project=mobile --workers=2
npm run test:journey
npm run build
```

All seven slices and the final consistency review are complete. Stable code was not
rewritten solely to reduce file sizes. The repository is ready for human diff review
and commit; this work did not commit, push or deploy it.

## Shared UI layer — 2026-10-18

A follow-up request asked for one common component folder reused across the app. The
canonical layer is [`src/components/shared/`](../src/components/shared/), documented in
its [folder README](../src/components/shared/README.md). Seven existing primitives moved
there with no compatibility copies, and four compositions cover patterns that had been
duplicated: section panels, icon badges, empty states and actionable notices. Progress,
Practice, Portfolio, Settings and every page/loading boundary now consume them; feature
data, retry policy and navigation stay feature-owned. Intentional layout differences
(Settings forms, Today and landing sections) were left intact rather than flattened into
one template.

A second pass widened the folder to the small elements that were being copied: three
button weights (`ActionButton`, `NavigationButton`), soft status/level chips (`ToneChip`),
section headings (`SectionTitle`), labelled loading bars (`LoadingBar`) and hidden helper
text (`VisuallyHidden`). Workspace screens now use them; the marketing landing page keeps
its distinct button compositions on purpose.

Verification: 296 unit tests passed (7 opt-in skipped) with 12 shared component contract
cases; 102 targeted desktop/mobile browser checks passed across Today, path, lessons,
feedback, Practice, Progress, Portfolio, Settings, weekly goal and writing flows; and the
16-case shared UI spec rechecked spacing, heading/id pairing, badge sizing, keyboard
actions, empty states, action weights with client-side navigation, chip/loading semantics,
Vietnamese dark-mode wrapping and writing safeguards. No dependency, theme, translation,
API or state contract changed. See [shared UI verification](verification/shared-ui.md).


## Verification practices and fixes

Unit/static coverage grew from 200 to 284 passing tests (seven opt-in tests remain
skipped). New coverage checks orchestration contracts, domain/HTTP/page mappings,
review rules, completion evidence, AI retry/usage behavior and lint boundaries.
Browser regressions additionally cover recovery-key lifecycle and Practice duplicate
submission/stale-queue behavior.

Two observed verification issues were addressed rather than hidden with retries:

1. Parallel local PGlite startup exceeded a fixture setup limit. Vitest now runs at
   most four workers; application and test timeouts were not increased.
2. A new Practice test assumed one mount GET. It now compares explicit refreshes
   against the hydrated Strict Mode baseline. Application behavior was not changed.

## Unchanged contracts and non-goals

Request/response shapes, cache and retry headers, storage keys, revision boundaries,
owner isolation, quotas, prompt text, model configuration, token budgets, grading,
checkpoint thresholds, content review/growth gates, UTC rules, queue ordering,
navigation warnings, keyboard focus, reduced motion, English/Vietnamese messages and
visual styling are preserved.

Hosted sign-in, live AI quality, production load testing, reviewed curriculum/target
precision, abuse controls, account export/deletion, and deployment remain separate
product/release work. Paid live-provider tests and hosted database mutations were not
part of this refactor. See the individual evidence reports for local/synthetic limits.
