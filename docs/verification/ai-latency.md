# AI latency and low-effort placement

## Changed contract

Placement enables thinking with `reasoning_effort: "low"`. Its 4,096-token budget includes reasoning and the final JSON. The previous 400-token limit targeted only a short non-thinking result.
The shared 25-second deadline and one validation retry remain unchanged.
Feedback and explanations still disable thinking. Enabling low-effort thinking there would not be a speed optimization.

All three adapters already use JSON mode, request JSON explicitly, provide example JSON, and validate the result.
References: [DeepSeek JSON mode](https://api-docs.deepseek.com/guides/json_mode) and [thinking mode](https://api-docs.deepseek.com/guides/thinking_mode).

## Live evidence

Two sequential diagnostic runs used synthetic writing and the configured `deepseek-flash` model. They bypassed authentication, the database, and the browser.
All six results passed the actual adapter's validation. Each operation made one provider request; no validation retry occurred.

| Operation | Adapter time, run 1 / run 2 | HTTP headers, run 1 / run 2 | Completion tokens, run 1 / run 2 |
| --- | --- | --- | --- |
| Feedback | 2,903 / 2,870 ms | 380 / 405 ms | 558 / 656 |
| Placement, low effort | 2,559 / 2,271 ms | 259 / 281 ms | 337 / 332 |
| Explanation | 819 / 1,023 ms | 153 / 264 ms | 76 / 67 |

Placement reported 282 reasoning tokens in both runs. Feedback used 931 prompt tokens and explanation used 436.
The recorded samples show that most provider wait occurred after HTTP headers, while receiving generated output. Header time is not time to first generated token.
Prompt reading, parsing, and validation added roughly 1–10 milliseconds beyond the measured full response.
These two runs do not prove sustained latency or identify the cause of longer waits in the signed-in app.

## Remaining request-path delays

`POST /api/feedback` verifies the session, loads the trusted task, reserves the submission, loads its status, claims it, invokes the provider, and saves the result.
Those database operations use separate owned transactions. Provider measurements above exclude their network round trips.
The browser then navigates to a saved-feedback page, which needs another server load.

Feedback is non-streaming: the UI receives no partial result before the complete JSON passes validation.
Invalid or empty JSON triggers one additional provider call within the same 45-second deadline.
The browser's 55-second POST deadline can be followed by up to 15 seconds of safe status recovery.
These are upper bounds and possible paths, not measured typical request times.

For a much longer real-app wait, inspect the browser network entry for `/api/feedback` and separate it from the subsequent page navigation.
Compare that request time with the saved `ai_usage.latency_ms`, which currently measures the provider adapter, not the whole route.
Do not change thinking mode or shorten output without evaluating feedback quality.

## Repeat command

This command consumes paid API tokens. It sends synthetic text only and stores timings and token counts, not prompts, generated text, or credentials.
Each run can make up to six provider requests if every adapter needs its validation retry.

```sh
MEASURE_AI_LIVE=true node --env-file=.env --import tsx scripts/measure-ai-latency.ts
```

Local HTTP regression tests verify the placement request's enabled/low settings and reasoning budget. Existing feedback and explanation tests verify that thinking stays disabled.
