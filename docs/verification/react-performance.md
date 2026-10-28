# React performance pass

## Changes

- Request-scoped `React.cache` shares `currentUser()` validation between the layout and page. Supabase `getUser()` still validates the session. Proxy and API checks retain their independent validation; there is no cache shared across users or requests.
- Progress downloads its report component and requests its data concurrently. Its existing wave skeleton stays mounted until both are ready, with the existing session/retry notices and a timeout covering the load.
- IELTS task figures load the MUI plotting code only when a task has chart data. Captions and accessible data tables remain in the lightweight component; the plot fallback reserves the same 260px height.
- Placement sample fields now reserve their three text lines before hydration. The first regression run exposed a 45.75px panel mismatch: MUI's textarea autosizer had not run when the skeleton was measured. The skeleton and actual form now use the same field component and line-height reservation. The Placement test explicitly holds external JavaScript while measuring the streamed skeleton.

## Bundle evidence

Measured with Next.js 16.4.2's production analyzer, comparing the working tree immediately before and after this performance pass. These are eager, minified client **module bytes, uncompressed**, summed from the analyzer's client entry output group. They include shared modules, exclude chunk wrappers, and do not include deferred imports. They are not transferred bytes or measured page-load times. Deferred report/chart code still downloads when needed.

Exact comparisons are recorded in [react-performance-bundles.json](./react-performance-bundles.json). The landing page changed by roughly 0.1%; Today was effectively unchanged. The measured improvements apply to the Progress and LiveStudio entry groups, not to every route's total JavaScript.

| Client entry | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Progress | 691,566 bytes | 318,739 bytes | 53.9% |
| LiveStudio | 1,222,946 bytes | 583,582 bytes | 52.3% |

Reproduce a comparison around a source change:

```sh
pnpm exec next analyze --output --snapshot performance-before
pnpm exec next analyze export --snapshot performance-before > /tmp/writing-bundle-before.jsonl
# Apply the change, then:
pnpm exec next analyze --output --snapshot performance-after
pnpm exec next analyze export --snapshot performance-after > /tmp/writing-bundle-after.jsonl
node scripts/compare-client-bundles.mjs /tmp/writing-bundle-before.jsonl /tmp/writing-bundle-after.jsonl
```

## Verification

- `pnpm run format`, `pnpm run check`, and `pnpm run build` passed. Unit results: 324 passed, 7 skipped.
- `tests/auth-render-cache.test.ts` runs the real React Server Component renderer with stubbed Supabase/Next cookie access. Four callers in each render validate once; concurrent Alice/Bob renders stay isolated; expired and unconfigured sessions return anonymous results.
- Desktop and mobile Playwright checks cover Progress data/errors, motion, improvement/empty states, IELTS line/bar charts and lesson-to-writing navigation, writing-check recovery, navigation, locales, and all 16 content skeleton handoffs. The handoff spec captures panel bounds and samples animation frames for blank content. Configured Google sign-in checks skip when credentials are absent; other skips select the applicable viewport.
- The Placement mismatch was fixed after the first run, then verified with JavaScript held before hydration. The entire handoff spec and Placement curriculum flow were checked again on desktop and mobile.
- A subsequent Onboarding check exposed a measurement race: the skeleton disappeared between a successful bounds poll and a separate bounds read. The test now retains the bounds from the successful poll. Targeted Onboarding and Placement checks verified that correction on both viewports.
- Final captured artifacts cover all 16 screens on desktop and mobile: 32 handoffs, 9,128 sampled frames, zero blank frames. Placement's desktop panel bounds are identical before and after hydration, including its 616.46875px height.

The browser checks use development preview routes for authenticated content. No production-user Core Web Vitals, real Supabase round-trip timings, or real AI response latencies were measured.

## Next professional priorities

1. Record production p75 LCP, INP, and CLS per route and device, plus server spans for auth, database access, and coach responses. Set regression budgets from that baseline.
2. Inspect authenticated first-load waterfalls. Progress still begins its API request after hydration; streaming initial data from a Server Component is the next candidate if production traces show that delay matters. Retain refresh/retry behavior and private-data isolation.
3. Measure database work with realistic learner histories. Progress currently reads writing and practice history before summarizing it. Use query plans and response sizes to choose aggregates or bounded reads while preserving the report's semantics.
4. Profile editor typing on slower devices before adding memoization. Isolate expensive static task content if it consumes meaningful interaction time; avoid spreading memoization throughout inexpensive components.

## References

- [Next.js package bundle analysis](https://nextjs.org/docs/app/guides/package-bundling)
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [React request cache](https://react.dev/reference/react/cache)
- [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

Implementation also followed the installed `vercel-react-best-practices` skill and the version-matched guides under `node_modules/next/dist/docs/`.
