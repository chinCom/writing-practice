# A1–B1 curriculum review

`a1-b1.draft.json` contains three draft units and six lessons. Each lesson has a model, two warm-ups, and a writing task. Each unit ends with a checkpoint.

This content is an offline draft. It has not received human review. The app uses it only in development previews until a reviewer approves it.

## Offline generation

`npm run curriculum:generate` makes a paid provider call and writes `a1-b1.generated.json`. It never publishes lessons or overwrites an existing candidate. The generated file is a draft, not reviewed teaching material. Compare it with `a1-b1.draft.json` and copy accepted changes into that draft before review.

## Review and seed

1. Ask a qualified English teacher to review every model, prompt, answer, hint, scaffold, and level.
2. Check that each warm-up has one clear answer. Check all word ranges and checkpoint criteria.
3. Fix the draft before approval. Do not rename published task or lesson identifiers without a migration plan.
4. Run `sha256sum curriculum/a1-b1.draft.json` after all changes.
5. Create `curriculum/review.json` with the exact content hash, reviewer name, and review date:

```json
{
  "approved": true,
  "contentHash": "EXACT_SHA256",
  "reviewer": "HUMAN_REVIEWER_NAME",
  "reviewedAt": "2026-10-14T00:00:00Z"
}
```

6. Run `npm run db:migrate`.
7. Run `npm run curriculum:seed`.

The seed command rejects missing approval and changed content. It updates only these curriculum units. It does not delete learner writing or progress.

## Scope

This is a small starting curriculum, not the full 15-unit-per-level course. Placement provides an A1–B1 practice estimate. It does not certify a CEFR level. Lessons are not generated during learner requests.
