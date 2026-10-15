# Curriculum review and publication

The app supports two separately reviewed draft tracks:

| Track | Source | Size | Practice length |
|---|---|---|---|
| Core Writing Path | `course.draft.json` | 21 units, 63 lessons, PRE_A1–C2 | Level-specific ranges |
| IELTS Writing Workspace | `ielts.draft.json` | 8 units, 24 lessons | Task 1: 150–180 words; Task 2: 250–350 words |

Core preserves legacy unit, lesson, and task identifiers. IELTS groups Academic Task 1, General Training Task 1, and Task 2. Each IELTS unit can be entered independently. Lessons within each unit remain sequential.

These files are draft teaching content, not approved material. Completion is not CEFR certification. IELTS practice uses the existing 1–5 rubric, not official IELTS band scores. Drafts are available in development previews. Production loads only database content that passed the review and seed gate.

See [track verification](../docs/verification/curriculum-tracks.md) for the current implementation. The [original course plan](../docs/superpowers/plans/2026-10-14-writing-course.md) records the earlier research and scope.

## Local preview and validation

```sh
python3 scripts/author-course.py
npx tsx scripts/generate-curriculum.ts --validate
```

The Python command regenerates both draft files and checks their Python constraints. The second command applies the application's actual Zod schema to both files and their combined identifiers. Neither command calls a provider or publishes content.

Do not regenerate over reviewed edits without saving those edits first. The optional `--include-ielts-in-core` authoring mode is not a seed input: keep the two application tracks separate to avoid duplicate identifiers.

Open `/dev/preview/path?course=full&track=core` or `/dev/preview/path?course=full&track=ielts`. Server-side warm-up checks and labelled synthetic writing results exercise progression without a provider call. Preview routes return 404 in production.

`a1-b1.draft.json` remains a legacy fixture. Without `--validate`, `scripts/generate-curriculum.ts` is a separate, opt-in paid A1–B1 candidate generator. It requires `GENERATE_CURRICULUM_LIVE=true` and never overwrites the current tracks. The app never generates lessons during learner requests.

## Review and seed

1. Ask a qualified teacher to review all models, prompts, answers, hints, scaffolds, task limits, and levels in both files.
2. Verify IELTS data descriptions, factual claims, genre requirements, and assessment claims. Band references in draft lesson titles are goals, not validated outcomes.
3. Preserve existing unit, lesson, and task identifiers when editing. Record intentional contract changes.
4. Run both validation commands after edits.
5. Run `sha256sum curriculum/course.draft.json curriculum/ielts.draft.json`.
6. Create `curriculum/review.json` for Core and `curriculum/ielts.review.json` for IELTS. Each approval must name a human reviewer and match its own file's exact hash:

```json
{
  "approved": true,
  "contentHash": "EXACT_SHA256_FOR_THIS_TRACK",
  "reviewer": "HUMAN_REVIEWER_NAME",
  "reviewedAt": "2026-10-15T00:00:00Z"
}
```

7. Confirm the intended database and its backup. Existing databases need migrations through `0009_writing_course.sql` before seeding. No additional migration is required for track support.
8. Run `npm run curriculum:seed` with the intended `DATABASE_URL`.

The seeder validates both approvals and combined content before opening a database connection. It upserts all 29 units in one transaction without deleting learner writing or progress. Missing or stale approval blocks the entire seed. No teacher approval or hosted content seed was performed for this slice.

Hosted migration `0009` was applied previously with user approval. See [hosted schema verification](../docs/verification/today-database.md#hosted-schema-upgrade).

## Progression and privacy

- Core starts at the chosen level and progresses sequentially.
- IELTS permits entry into any unit without Core placement. Warm-ups and writing still gate subsequent lessons within that unit.
- A completed lesson requires all warm-ups and a safe completed writing check.
- Checkpoints also require average rubric score ≥3.5 and grammar ≥3.
- Word banks and sentence frames follow the supplied task, including optional advanced word banks.
- Placement remains an A1–B1 estimate. Core starting levels remain PRE_A1–C2.
- Public lesson payloads omit answer keys and hints. The server returns a hint only after checking an incorrect answer.
