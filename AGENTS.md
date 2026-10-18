## Code readability

- Keep code formatted with `pnpm run format` and verify with `pnpm run format:check`.
- Use descriptive names and small, named components. Avoid dense one-line functions and nested UI expressions.
- Keep formatting changes separate from behavior changes when practical.
- Do not run subagents for this project.

## Testing

- Run only the Playwright spec files related to the change. Name them explicitly, for example:
  `pnpm exec playwright test tests/e2e/path-tabs.spec.ts --project=desktop --project=mobile`.
- Do not run the full `pnpm exec playwright test` suite by default. Run it only before a release, when a change crosses shared shell/auth/routing/theme boundaries, or when the user explicitly asks for it.
- Run `pnpm run test:journey` only for changes that touch the end-to-end learner journey.
- `pnpm run check` is the default static and unit gate. Run the relevant parts while iterating, and the whole command before finishing.
- When a test is flaky, fix the test or the code it exercises; do not rerun the full suite to hide it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
