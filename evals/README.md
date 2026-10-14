# A2 feedback evaluation pilot

This pilot contains 12 synthetic weekend messages: four clean texts and eight texts with one planted error each.
It is not the 100–200-text, cross-level, human-reviewed benchmark required by `PROJECT.md`.

## Run

**Cost risk:** This command makes paid AI calls. The coach can retry each case once.

```sh
EVAL_LIVE=true npm run evals
```

Set `DEEPSEEK_API_KEY` in private environment variables or `.env`.
Optional `DEEPSEEK_MODEL` and `DEEPSEEK_BASE_URL` select the provider.
The runner saves metrics and correction outputs in `evals/results/latest.json`.
It never uses real learner writing.

## Latest recorded result

For `deepseek-flash` with prompt `feedback-a2-1`:

| Measure | Result |
| --- | --- |
| Planted errors caught | 8 of 8 |
| Unsupported error claims | 1 |
| Precision | 88.9% |
| Recall | 100% |
| Valid output after retry | 12 of 12 |
| Clean texts with an error claim | 0 of 4 |
| Mean tokens per successful case, including retries | 1,168 |
| Mean successful-case latency | 2.27 seconds |

The extra error claim added a comma before “and” in a short message.
Review this behavior in a larger set before changing the prompt.
Model responses vary between runs. These results do not establish production quality.

## Scoring boundary

The scorer matches each planted fix once. It permits unchanged context around the minimal fix.
It rejects a correction that also changes unrelated words. Optional style changes and confidence below 0.7 are not error claims.
Failed outputs count against validity and leave planted errors uncaught.
The runner asserts case count and valid output. It records quality metrics without enforcing broad release thresholds on this small set.
Failed provider calls cannot report their token usage. The report has no monetary cost estimate.
The original scorer rejected correct fixes inside longer snippets. A failing regression test reproduced this defect before the matcher changed.

## Remaining work

Expand to 100–200 texts across levels. Obtain qualified human review of expected corrections and clean texts.
Add repeat-run analysis, task scores, safety/injection cases, provider cost accounting, and release quality thresholds.
Do not mark the broad evaluation milestone complete from this pilot.
