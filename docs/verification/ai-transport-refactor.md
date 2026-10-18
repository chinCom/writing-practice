# Shared AI transport refactor

Date: 2026-10-18

[`client`](../../src/lib/llm/client.ts) now owns provider construction, completion
transport errors, one invalid-output retry, and token accounting. Provider errors
have a neutral module; the grading module re-exports the same class for compatibility.
Feedback, explanation and development adapters declare the shared explicit AI result
contract used by persistence. Placement retains its original result-only return shape.

Each adapter still specifies its own messages, validation, prompt loading strategy,
output budget, thinking mode and a single deadline shared by both validation attempts:

| Feature | Deadline | Output budget | Thinking |
| --- | --- | --- | --- |
| Feedback | 45 seconds | 2,400 or 2,700 with targets | Disabled |
| Explanation | 15 seconds | 600 | Disabled |
| Development | 15 seconds | 500 | Disabled |
| Placement | 25 seconds | 4,096 | Enabled, low effort |

No prompt text, correction filters, safety behavior, length budgets, schema validation,
mock behavior, quotas, database writes or automatic transport retry policies changed.
The SDK still has `maxRetries: 0`. Usage accumulates across validation attempts, keeps
provider cache-field precedence, and defaults missing metadata to zero.

## Evidence

- Nine new shared-client regressions passed using local HTTP fixtures, including
  caller-signal reuse after invalid output and a provider outage with no transport retry.
- Twenty-nine focused provider/client tests passed.
- `npm run check`: 271 tests passed and 7 opt-in tests skipped.
- Thirty targeted desktop/mobile checks passed across `explanation`, `develop-writing`,
  `curriculum-errors`, and `writing-check`.
- Integrated synthetic learner journey and production build passed.

No paid-provider checks were run. These checks establish request/validation contracts
and local behavior, not live model quality, live latency or hosted integration health.
