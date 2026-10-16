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

## Growth-loop target study (M3)

The same harness accepts a private JSONL corpus through `EVAL_TARGET_CORPUS`.
No corpus or passing study result is supplied. The existing synthetic pilot does not satisfy this gate.

**Privacy and cost risk:** Obtain consent, remove identifying details, and manually verify annotations before running.
The command sends every text to the provider three times. Each call can retry validation once.
Use 30 texts for calibration, or at least 40 for precision eligibility (maximum 60).
Keep the corpus and generated `evals/results/targets-latest.json` private. The result contains model-produced text.
Do not commit real learner writing or identifying reviewer names.

```sh
EVAL_LIVE=true EVAL_TARGET_CORPUS=/private/reviewed-targets.jsonl DEEPSEEK_MODEL=<pinned-model-id> npm run evals
```

Each JSONL object has these fields:

- `id`: unique, de-identified case identifier.
- `text`: consented learner writing, at most 6,500 characters.
- `level`: `A1`, `A2`, or `B1`.
- `task`: full existing curriculum task object, same level, not a checkpoint.
- `annotation`: `human` (synthetic data is for calculation tests only).
- `annotator`: non-identifying reviewer code.
- `secondCheckedBy`: distinct reviewer code for at least 25% of the precision corpus.
- `expectedTaskScore`: human task score, integer 0–5.
- `targets`: one or two distinct entries with `tag`, `uses` (0–100), and `expected` corrections.
  Each expected correction contains `original` and accepted `suggestions`.

Cover all three levels and the five most frequent countable A1–B1 Core focus tags:
`connectors`, `verb-tense`, `prepositions`, `modal-verbs`, and `punctuation`.
These tags come from the checked-in `curriculum/course.draft.json`; broad discourse tags are feedback-only.

The summary records target-error precision, pass instability (runs differing from their text's majority),
and disagreement with the human pass result. Eligibility conservatively requires both disagreement rates ≤10%,
precision ≥0.85, complete valid three-run results, fixed grader version, coverage, and review metadata.
The calculation cannot prove that reviewers are qualified or that consent exists. Manual review remains required.
No report automatically enables progression.

Noise is the square root of mean within-text sample variance, for each rubric score and target error rate.
Zero-use target rates are unknown and excluded, not recorded as perfect accuracy.
Missing reports, failed calls, duplicate runs, and mixed grader versions prevent eligibility.
Failed calls have unknown usage; their reported token and latency fields are zero placeholders, not measured cost.
The pinned model identifier cannot prevent a provider from silently updating an alias.

### Provisional AI diagnostic

`EVAL_TARGET_MODE=ai-diagnostic` accepts a separate, strictly labelled AI-reviewed JSONL contract.
Use `annotation: "ai-reviewed"`, `reviewStatus: "provisional-not-human-gold"`, and estimated `usesEstimate` instead of human `uses`.
Each target also contains `withheldCorrections` and `reviewNote`; each case contains `taskNote`.
The runner preserves AI provenance. It never relabels these cases as human annotations.

```sh
EVAL_LIVE=true EVAL_TARGET_MODE=ai-diagnostic EVAL_TARGET_CORPUS=/private/ai-review.jsonl DEEPSEEK_MODEL=<pinned-model-id> npm run evals
```

The same privacy and cost requirements apply. Reports checkpoint after each text; interrupted runs are not automatically resumed.
The private, ignored output is `evals/results/targets-ai-diagnostic.json`, created with owner-only file permissions.
`referencePassDisagreementRate` compares with the supplied reference. `humanPassDisagreementRate` is null for AI references.
A target with zero uses cannot pass in either reference or model results.
AI diagnostic reports always have `gatePassed: false` and `noiseReady: false`, even with perfect synthetic agreement.
Diagnostic completion means calls were recorded, not that the model or the reference was validated.

Results from an external learner corpus were withdrawn on 2026-10-16: its licence does not permit evaluating a commercial product, so no corpus-derived figures are recorded here and none may be used. M3 needs a licensed, consented corpus, such as writing from the D5 pilot.
