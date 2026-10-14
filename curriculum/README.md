# Writing course review and publication

`course.draft.json` contains 21 units and 63 lessons across PRE_A1, A1, A2, B1, B2, C1, and C2. Each level has three units. Each unit has three lessons and ends with a checkpoint.

The course moves from first sentences to linked messages, evidence, formal requests, arguments, application letters, and critical editing. B2/C1 tasks teach purpose, relevant experience, programme fit, and future contribution. Learners must use truthful details and verify programme facts.

This is original offline draft content, not approved teaching material. It is available only in development previews until a qualified teacher approves it. Completion is not CEFR certification or proof of learning effectiveness. This bounded course is smaller than the original target of 15 units per level.

See the [research and implementation plan](../docs/superpowers/plans/2026-10-14-writing-course.md) and [verification evidence](../docs/verification/writing-course.md).

## Local preview

Run the development server, then open `/dev/preview/path?course=full`.

Warm-up checks run on the server. Synthetic writing results exercise progression without a provider call. They are labelled as previews, not assessments. These routes return 404 in production.

## Offline authoring

`python3 scripts/author-course.py` recreates `course.draft.json` from the original offline templates and retained A1–B1 identifiers. Do not run it over reviewed edits without saving those edits first. Models are fictional examples, not supplied personal letters.

`a1-b1.draft.json` remains a legacy fixture. `npm run curriculum:generate` makes a paid provider call and writes the separate `a1-b1.generated.json` candidate. Neither file is the current seed input. The application never generates lessons during learner requests.

## Review and seed

1. Ask a qualified English teacher to review every model, prompt, answer, hint, scaffold, task, and level in `course.draft.json`.
2. Check that each warm-up has one clear answer. Check word ranges, factual claims, genre progression, and checkpoint criteria.
3. Fix the draft before approval. Preserve existing lesson and task identifiers. Record any intentional change to an existing task contract.
4. Run `sha256sum curriculum/course.draft.json` after all changes.
5. Create `curriculum/review.json` with the exact hash, reviewer name, and review date:

```json
{
  "approved": true,
  "contentHash": "EXACT_SHA256",
  "reviewer": "HUMAN_REVIEWER_NAME",
  "reviewedAt": "2026-10-14T00:00:00Z"
}
```

6. Review the target database and back up production data before migration.
7. Run `npm run db:migrate` with the intended `DATABASE_URL`. Migration `0009_writing_course.sql` extends course limits and adds owner-protected Practice source markers.
8. Run `npm run curriculum:seed` with the intended `DATABASE_URL`.

The seed command rejects missing approval and changed content. It upserts reviewed units in one transaction. It does not delete learner writing or progress. No teacher approval, hosted migration, or content publication was performed during local implementation.

## Progression

- A lesson requires completed warm-ups and a safe completed writing check.
- A checkpoint also requires average rubric score of at least 3.5 and grammar of at least 3.
- Advanced tasks omit sentence frames and word banks where independent writing is required.
- Placement remains an A1–B1 practice estimate. Learners can choose any of the seven course starting levels.
- Answer keys and retry hints stay server-side until an answer is checked.
