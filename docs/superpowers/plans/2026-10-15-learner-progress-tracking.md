# Learner Progress Tracking Implementation Plan

> **For agentic workers:** Execute this plan task by task in one session with superpowers:executing-plans. Do **not** use subagents: `AGENTS.md` for this project forbids them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show learners how their writing improves over time, and make Today move them through the course instead of repeating one fixed task.

**Architecture:** No new tables or migrations. All data already exists. `submissions` and `feedback` hold rubric scores, words and corrections for every check. `lesson_progress` and the completed checks hold course completion. New pure functions turn those rows into improvement and course summaries. The existing database loaders call these functions, and the existing Progress and Today screens render the results.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, MUI 9 and `@mui/x-charts` (already installed), Drizzle on Supabase Postgres, next-intl (`messages/en.json`, `messages/vi.json`), Vitest with PGlite, and Playwright.

**Spec:** This plan is the spec. The evidence behind it:

- Hosted data on 2026-10-15: 30 submissions, 18 completed checks, 4 revisions, and 36 practice answers. **Every submission used `task_id = 'weekend'`.** `lesson_progress` had **0 rows**.
- `src/components/today/Today.tsx` `NextTaskCard` is hardcoded. The `A2` chip, the title "Tell a friend about your weekend", the focus "past-tense verbs" and the link `/write/weekend` never change.
- `src/components/today/AccountActivity.tsx` shows "10 of 5" when the learner passes the weekly goal.
- `src/lib/progress.ts` summarizes the level estimate, error groups, streaks and review accuracy. It never uses the four rubric scores (`task`, `organization`, `grammar`, `vocabulary`), and it does not show whether the error rate falls over time.
- The Progress page does not show course completion. The learning path computes it, but only on `/path`.

## Before you start

1. Run `git status`. The tree can contain uncommitted work from another session, for example `src/components/progress/Progress.tsx`, `src/theme/theme.ts` or `tests/e2e/progress-motion.spec.ts`. Do not overwrite that work. Ask the owner to commit it first, or build on top of it and leave those changes out of your commits.
2. Read `AGENTS.md` (repo root and project) and `PROJECT.md` §0.
3. Make sure the dev server can start: run `npm run dev`, then open `http://127.0.0.1:3000/dev/preview/progress`.
4. This Next.js version differs from older versions. If you touch routing or server components, read the relevant guide in `node_modules/next/dist/docs/` first.

## Global Constraints

- No database migration, no new table, no new npm dependency.
- Days and weeks use **UTC**, and weeks start on Monday, the same as `summarizeProgress` (`(getUTCDay() + 6) % 7`).
- Rubric scores are integers 0–5 (`src/lib/feedback/schema.ts`). They are **practice scores, not CEFR certification or IELTS bands**. Every new score display carries the disclaimer key `progress.improvementDisclaimer`.
- Trends use **first attempts only** (`attempt === 1`), so revisions do not inflate them. Revisions are reported separately as "revision gain".
- Exclude safety-flagged feedback everywhere. The existing query already filters `json->>'safety_flag' = 'false'`.
- An error counts only when `confidence >= 0.7` and `severity !== 'style'`, the same rule as `summarizeProgress`.
- Every new UI string goes into **both** `messages/en.json` and `messages/vi.json`.
- Use MUI components and `sx` only. ESLint forbids raw HTML tags, `style`, `className`, hex colors and `rgb()` outside `src/theme`.
- Respect `prefers-reduced-motion`. Pass `skipAnimation={reducedMotion}` to charts, as `Progress.tsx` already does.
- Format with `npm run format`. `npm run check` must pass at the end of every task.
- Commit after each task. End each commit message with `Co-Authored-By:` only if your harness requires it. Do not push.

## Review Focus

Check these five inputs most closely. Each one has a test in the task that owns the code.

1. **A learner with fewer than 6 first-attempt checks.** Expected: no "then vs now" comparison, and a clear "write N more checks" message. Never `NaN`, `Infinity` or an empty chart. (Task 1 test "needs six first attempts", Task 4 e2e "empty state".)
2. **A learner who goes past the weekly goal (10 sessions, goal 5).** Expected: "Goal met", not "10 of 5". (Task 5 e2e "goal met".)
3. **A learner with no placement, or a database with no seeded curriculum.** Expected: Today offers "Find your starting level", or falls back to the weekend task. It never shows an empty card or crashes. (Task 2 tests "no placement" and "no curriculum".)
4. **A revision whose parent is missing or safety-flagged.** Expected: the revision is ignored in revision gain and does not crash. (Task 1 test "orphan revision".)
5. **Checks near the UTC week boundary.** Sunday 23:30Z and Monday 00:10Z must land in different weeks. Future timestamps are ignored. (Task 1 test "UTC weeks".)

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/improvement.ts` (new) | Pure: rubric and error-rate trends, then vs now, revision gain |
| `src/lib/course-progress.ts` (new) | Pure: course completion summary for one track |
| `src/lib/next-task.ts` (new) | Pure: choose Today's task from the learning path |
| `src/lib/curriculum-path.ts` | Add `completedAt` to each lesson. Export the `CoursePathUnit` type |
| `src/lib/db/curriculum.ts` | Pass lesson completion times and check times to `buildCoursePath` |
| `src/lib/db/progress.ts` | Add `improvement` to the progress report. `loadProgress` also adds `course` |
| `src/lib/db/today.ts` | No change. It gets `improvement` through `progressInTransaction` |
| `src/components/progress/Improvement.tsx` (new) | "Your improvement" section |
| `src/components/progress/CourseProgress.tsx` (new) | Course completion cards |
| `src/components/progress/Progress.tsx` | Render the two new sections |
| `src/components/today/Today.tsx` | `NextTaskCard` driven by `NextTask` |
| `src/components/today/AccountActivity.tsx` | "Goal met" state and an improvement highlight |
| `src/app/today/page.tsx` | Compute `next` with `nextTask()` |
| `src/mocks/progress.sample.ts`, `src/mocks/today.sample.ts` | Preview data for the new fields |
| `src/app/dev/preview/[screen]/page.tsx` | Preview screens `today-placement` and `progress-empty` |
| `messages/en.json`, `messages/vi.json` | New strings |
| Tests | `tests/improvement.test.ts`, `tests/course-progress.test.ts`, `tests/next-task.test.ts`, `tests/progress-database.test.ts`, `tests/e2e/progress-improvement.spec.ts`, `tests/e2e/today-next-task.spec.ts` |

---

### Task 1: Improvement summary (pure)

**Files:**
- Create: `src/lib/improvement.ts`
- Test: `tests/improvement.test.ts`

**Interfaces:**
- Consumes: `Feedback`, `LocatedCorrection` from `@/lib/feedback/schema`.
- Produces:
  ```ts
  export const scoreKeys: readonly ['task', 'organization', 'grammar', 'vocabulary'];
  export type ScoreKey = (typeof scoreKeys)[number];
  export type CheckEvent = {
    id: string; at: string; attempt: number; parentId: string | null; words: number;
    scores: Feedback['scores'];
    corrections: Pick<LocatedCorrection, 'confidence' | 'severity'>[];
  };
  export type SkillSnapshot = Record<ScoreKey, number> & { average: number; errorsPer100Words: number };
  export type Improvement = {
    firstChecks: number;
    checksNeeded: number;
    weekly: ({ weekStart: string; checks: number } & SkillSnapshot)[];
    thenVsNow: { then: SkillSnapshot; now: SkillSnapshot } | null;
    revisionGain: { pairs: number; averageDelta: number } | null;
  };
  export function weekStartUtc(at: string): string; // 'YYYY-MM-DD' Monday
  export function summarizeImprovement(checks: CheckEvent[], now?: Date): Improvement;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/improvement.test.ts`:

```ts
import { expect, it } from 'vitest';
import { summarizeImprovement, weekStartUtc, type CheckEvent } from '@/lib/improvement';

const now = new Date('2026-10-30T12:00:00Z');
let counter = 0;
function check(
  at: string,
  scores: [number, number, number, number],
  options: Partial<CheckEvent> = {},
): CheckEvent {
  counter++;
  const [task, organization, grammar, vocabulary] = scores;
  return {
    id: 'check-' + counter,
    at,
    attempt: 1,
    parentId: null,
    words: 100,
    scores: { task, organization, grammar, vocabulary },
    corrections: [],
    ...options,
  };
}

it('needs six first attempts before comparing then and now', () => {
  const five = Array.from({ length: 5 }, (_, index) =>
    check(`2026-10-0${index + 1}T10:00:00Z`, [3, 3, 3, 3]),
  );
  const result = summarizeImprovement(five, now);
  expect(result.firstChecks).toBe(5);
  expect(result.checksNeeded).toBe(1);
  expect(result.thenVsNow).toBeNull();
  expect(summarizeImprovement([], now)).toEqual({
    firstChecks: 0,
    checksNeeded: 6,
    weekly: [],
    thenVsNow: null,
    revisionGain: null,
  });
});

it('compares the first three and the latest three first attempts, ignoring revisions', () => {
  const checks = [
    check('2026-10-05T10:00:00Z', [2, 2, 1, 2]),
    check('2026-10-06T10:00:00Z', [2, 3, 2, 2]),
    check('2026-10-07T10:00:00Z', [3, 2, 2, 3]),
    check('2026-10-07T11:00:00Z', [5, 5, 5, 5], { attempt: 2, parentId: 'check-3' }),
    check('2026-10-20T10:00:00Z', [4, 3, 3, 3]),
    check('2026-10-21T10:00:00Z', [4, 4, 3, 4]),
    check('2026-10-22T10:00:00Z', [4, 4, 4, 4]),
  ];
  const result = summarizeImprovement(checks, now);
  expect(result.firstChecks).toBe(6);
  expect(result.checksNeeded).toBe(0);
  expect(result.thenVsNow?.then).toMatchObject({ task: 2.3, grammar: 1.7, average: 2.2 });
  expect(result.thenVsNow?.now).toMatchObject({ task: 4, grammar: 3.3, average: 3.7 });
});

it('counts errors per 100 words with the same rule as the error groups', () => {
  const result = summarizeImprovement(
    [
      check('2026-10-05T10:00:00Z', [3, 3, 3, 3], {
        words: 50,
        corrections: [
          { confidence: 0.9, severity: 'major' },
          { confidence: 0.6, severity: 'major' },
          { confidence: 0.9, severity: 'style' },
          { confidence: 0.8, severity: 'minor' },
        ],
      }),
    ],
    now,
  );
  expect(result.weekly[0].errorsPer100Words).toBe(4);
});

it('reports the average revision gain and ignores orphan revisions', () => {
  const parent = check('2026-10-05T10:00:00Z', [2, 2, 2, 2]);
  const revision = check('2026-10-05T11:00:00Z', [3, 3, 3, 2], {
    attempt: 2,
    parentId: parent.id,
  });
  const orphan = check('2026-10-06T11:00:00Z', [5, 5, 5, 5], { attempt: 2, parentId: 'missing' });
  const result = summarizeImprovement([parent, revision, orphan], now);
  expect(result.revisionGain).toEqual({ pairs: 1, averageDelta: 0.8 });
});

it('buckets by UTC Monday weeks and ignores future checks', () => {
  expect(weekStartUtc('2026-10-11T23:30:00Z')).toBe('2026-10-05');
  expect(weekStartUtc('2026-10-12T00:10:00Z')).toBe('2026-10-12');
  const result = summarizeImprovement(
    [
      check('2026-10-11T23:30:00Z', [0, 0, 0, 0]),
      check('2026-10-12T00:10:00Z', [4, 4, 4, 4]),
      check('2026-11-02T10:00:00Z', [5, 5, 5, 5]),
    ],
    now,
  );
  expect(result.weekly.map((week) => [week.weekStart, week.checks, week.average])).toEqual([
    ['2026-10-05', 1, 0],
    ['2026-10-12', 1, 4],
  ]);
});
```

Explanation of the expected numbers in the second test: "then" is checks 1–3. `task` = (2+2+3)/3 = 2.33 → 2.3. `grammar` = (1+2+2)/3 = 1.67 → 1.7. The averages per check are 1.75, 2.25 and 2.5, and their mean is 2.17 → 2.2. "Now" is the last three first attempts. `task` = 4. `grammar` = (3+3+4)/3 = 3.3. The averages are 3.25, 3.75 and 4, and their mean is 3.67 → 3.7. The attempt-2 check is excluded. In the third test, two errors count (0.9 major and 0.8 minor) in 50 words, which gives 4 per 100 words. In the fourth test, the delta is the revision average 2.75 minus the parent average 2 = 0.75 → 0.8.

- [ ] **Step 2: Run the test to verify that it fails**

Run: `npx vitest run tests/improvement.test.ts`
Expected: FAIL, because `@/lib/improvement` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/improvement.ts`:

```ts
import type { Feedback, LocatedCorrection } from '@/lib/feedback/schema';

export const scoreKeys = ['task', 'organization', 'grammar', 'vocabulary'] as const;
export type ScoreKey = (typeof scoreKeys)[number];
export type CheckEvent = {
  id: string;
  at: string;
  attempt: number;
  parentId: string | null;
  words: number;
  scores: Feedback['scores'];
  corrections: Pick<LocatedCorrection, 'confidence' | 'severity'>[];
};
export type SkillSnapshot = Record<ScoreKey, number> & {
  average: number;
  errorsPer100Words: number;
};
export type Improvement = {
  firstChecks: number;
  checksNeeded: number;
  weekly: ({ weekStart: string; checks: number } & SkillSnapshot)[];
  thenVsNow: { then: SkillSnapshot; now: SkillSnapshot } | null;
  revisionGain: { pairs: number; averageDelta: number } | null;
};

// Compare the first three and the latest three first attempts, so one check cannot set a trend.
const compareSize = 3;
const dayMilliseconds = 86400000;
const roundOne = (value: number) => Math.round(value * 10) / 10;

function countedErrors(check: CheckEvent) {
  return check.corrections.filter(
    (correction) => correction.confidence >= 0.7 && correction.severity !== 'style',
  ).length;
}
function averageScore(scores: Feedback['scores']) {
  return scoreKeys.reduce((sum, key) => sum + scores[key], 0) / scoreKeys.length;
}
function mean(checks: CheckEvent[], pick: (check: CheckEvent) => number) {
  return roundOne(checks.reduce((sum, check) => sum + pick(check), 0) / checks.length);
}
function snapshot(checks: CheckEvent[]): SkillSnapshot {
  const words = checks.reduce((sum, check) => sum + check.words, 0);
  const errors = checks.reduce((sum, check) => sum + countedErrors(check), 0);
  return {
    task: mean(checks, (check) => check.scores.task),
    organization: mean(checks, (check) => check.scores.organization),
    grammar: mean(checks, (check) => check.scores.grammar),
    vocabulary: mean(checks, (check) => check.scores.vocabulary),
    average: mean(checks, (check) => averageScore(check.scores)),
    errorsPer100Words: words ? roundOne((errors / words) * 100) : 0,
  };
}
export function weekStartUtc(at: string) {
  const day = new Date(at.slice(0, 10) + 'T00:00:00Z');
  const monday = day.getTime() - ((day.getUTCDay() + 6) % 7) * dayMilliseconds;
  return new Date(monday).toISOString().slice(0, 10);
}
export function summarizeImprovement(checks: CheckEvent[], now = new Date()): Improvement {
  const past = checks
    .filter((check) => new Date(check.at) <= now)
    .sort((a, b) => a.at.localeCompare(b.at));
  const firstAttempts = past.filter((check) => check.attempt === 1);
  const weeks = new Map<string, CheckEvent[]>();
  for (const check of firstAttempts) {
    const key = weekStartUtc(check.at);
    weeks.set(key, [...(weeks.get(key) ?? []), check]);
  }
  const byId = new Map(past.map((check) => [check.id, check]));
  const deltas = past.flatMap((check) => {
    const parent = check.parentId ? byId.get(check.parentId) : undefined;
    return check.attempt > 1 && parent ? [averageScore(check.scores) - averageScore(parent.scores)] : [];
  });
  const enough = firstAttempts.length >= compareSize * 2;
  return {
    firstChecks: firstAttempts.length,
    checksNeeded: Math.max(0, compareSize * 2 - firstAttempts.length),
    weekly: [...weeks].map(([weekStart, events]) => ({
      weekStart,
      checks: events.length,
      ...snapshot(events),
    })),
    thenVsNow: enough
      ? {
          then: snapshot(firstAttempts.slice(0, compareSize)),
          now: snapshot(firstAttempts.slice(-compareSize)),
        }
      : null,
    revisionGain: deltas.length
      ? {
          pairs: deltas.length,
          averageDelta: roundOne(deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length),
        }
      : null,
  };
}
```

- [ ] **Step 4: Run the test to verify that it passes**

Run: `npx vitest run tests/improvement.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Format, check and commit**

```bash
npm run format && npm run check
git add src/lib/improvement.ts tests/improvement.test.ts
git commit -m "Add first-attempt improvement summary for rubric scores and error rate"
```

---

### Task 2: Course progress and Today's next task (pure)

**Files:**
- Modify: `src/lib/curriculum-path.ts` (`buildCoursePath`: add `completedAt` per lesson, export `CoursePathUnit`)
- Create: `src/lib/course-progress.ts`
- Create: `src/lib/next-task.ts`
- Test: `tests/course-progress.test.ts`, `tests/next-task.test.ts`

**Interfaces:**
- Consumes: `buildCoursePath(content, chosenLevel, progress, checks, track)` from `src/lib/curriculum-path.ts`, and `CurriculumLevel`, `CurriculumTrack`, `CurriculumUnit` from `@/lib/curriculum`.
- Produces:
  ```ts
  // curriculum-path.ts (new optional input fields; existing callers keep working)
  progress: { lessonId: string; warmups: Record<string, boolean>; completedAt?: Date | null }[]
  checks:   { taskId: string; at?: Date; feedback: {...} }[]
  // each returned lesson gains: completedAt: string | null
  export type CoursePathUnit = ReturnType<typeof buildCoursePath>[number];

  // course-progress.ts
  export type CourseProgress = {
    track: CurriculumTrack;
    lessonsDone: number; lessonsTotal: number;
    unitsDone: number; unitsTotal: number;
    doneThisWeek: number;
    levels: { level: CurriculumLevel; done: number; total: number }[];
    current: { lessonId: string; lessonTitle: string; unitTitle: string;
               level: CurriculumLevel; taskId: string; warmupsDone: boolean } | null;
    recent: { lessonId: string; title: string; completedAt: string }[];
  };
  export function summarizeCourse(units: CoursePathUnit[], track: CurriculumTrack, now?: Date): CourseProgress;

  // next-task.ts
  export type NextTask =
    | { kind: 'lesson'; level: CurriculumLevel; unitTitle: string; lessonTitle: string;
        prompt: string; minWords: number; maxWords: number;
        focus: CurriculumUnit['grammarFocus']; href: string; warmupsDone: boolean }
    | { kind: 'placement'; href: '/placement' }
    | { kind: 'weekend'; href: '/write/weekend' };
  export function nextTask(path?: { chosenLevel: CurriculumLevel | null; units: CoursePathUnit[] }): NextTask;
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/course-progress.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import { summarizeCourse } from '@/lib/course-progress';

const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);
const passing = { safety_flag: false, scores: { task: 4, organization: 4, grammar: 4, vocabulary: 4 } };
const now = new Date('2026-10-15T12:00:00Z');

function finish(lessonIndex: number, warmupsAt: string, checkAt: string) {
  const lesson = course.flatMap((unit) => unit.lessons)[lessonIndex];
  return {
    progress: {
      lessonId: lesson.id,
      warmups: Object.fromEntries(lesson.warmups.map((_, index) => [String(index), true])),
      completedAt: new Date(warmupsAt),
    },
    check: { taskId: lesson.task.id, at: new Date(checkAt), feedback: passing },
  };
}

it('dates a lesson by the later of warm-up completion and its first passing check', () => {
  const first = finish(0, '2026-10-13T09:00:00Z', '2026-10-14T09:00:00Z');
  const units = buildCoursePath(course, 'PRE_A1', [first.progress], [first.check], 'core');
  expect(units[0].lessons[0]).toMatchObject({ state: 'done', completedAt: '2026-10-14T09:00:00.000Z' });
  expect(units[0].lessons[1]).toMatchObject({ state: 'current', completedAt: null });
});

it('summarizes completion, the current lesson, and this UTC week', () => {
  const first = finish(0, '2026-10-05T09:00:00Z', '2026-10-05T10:00:00Z');
  const second = finish(1, '2026-10-13T09:00:00Z', '2026-10-13T10:00:00Z');
  const units = buildCoursePath(
    course,
    'PRE_A1',
    [first.progress, second.progress],
    [first.check, second.check],
    'core',
  );
  const summary = summarizeCourse(units, 'core', now);
  expect(summary).toMatchObject({
    track: 'core',
    lessonsDone: 2,
    lessonsTotal: 63,
    unitsDone: 0,
    unitsTotal: 21,
    doneThisWeek: 1,
  });
  expect(summary.levels[0]).toEqual({ level: 'PRE_A1', done: 2, total: 9 });
  expect(summary.current).toMatchObject({ lessonId: units[0].lessons[2].id, warmupsDone: false });
  expect(summary.recent.map((item) => item.lessonId)).toEqual([
    units[0].lessons[1].id,
    units[0].lessons[0].id,
  ]);
});

it('has no current lesson without placement', () => {
  const summary = summarizeCourse(buildCoursePath(course, null, [], [], 'core'), 'core', now);
  expect(summary.current).toBeNull();
  expect(summary.lessonsDone).toBe(0);
});
```

If PRE_A1 does not have exactly 3 units × 3 lessons = 9 lessons, read `curriculum/course.draft.json` and fix the expected `total`. Do not change the code to match a wrong number.

Create `tests/next-task.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import { nextTask } from '@/lib/next-task';

const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);

it('offers the current lesson and opens warm-ups first', () => {
  const units = buildCoursePath(course, 'A2', [], [], 'core');
  const unit = units.find((item) => item.level === 'A2')!;
  const lesson = unit.lessons[0];
  expect(nextTask({ chosenLevel: 'A2', units })).toEqual({
    kind: 'lesson',
    level: 'A2',
    unitTitle: unit.title,
    lessonTitle: lesson.title,
    prompt: lesson.task.prompt,
    minWords: lesson.task.minWords,
    maxWords: lesson.task.maxWords,
    focus: unit.grammarFocus,
    href: '/lesson/' + lesson.id,
    warmupsDone: false,
  });
});

it('goes straight to writing when warm-ups are done', () => {
  const lesson = course[0].lessons[0];
  const warmups = Object.fromEntries(lesson.warmups.map((_, index) => [String(index), true]));
  const units = buildCoursePath(course, 'PRE_A1', [{ lessonId: lesson.id, warmups }], [], 'core');
  expect(nextTask({ chosenLevel: 'PRE_A1', units })).toMatchObject({
    href: '/write/' + lesson.task.id,
    warmupsDone: true,
  });
});

it('asks for placement when no level is chosen', () => {
  expect(nextTask({ chosenLevel: null, units: buildCoursePath(course, null, [], [], 'core') })).toEqual({
    kind: 'placement',
    href: '/placement',
  });
});

it('falls back to the weekend task with no curriculum or no learning path', () => {
  expect(nextTask(undefined)).toEqual({ kind: 'weekend', href: '/write/weekend' });
  expect(nextTask({ chosenLevel: 'A2', units: [] })).toEqual({ kind: 'weekend', href: '/write/weekend' });
});
```

- [ ] **Step 2: Run the tests to verify that they fail**

Run: `npx vitest run tests/course-progress.test.ts tests/next-task.test.ts`
Expected: FAIL. The modules do not exist, and `completedAt` is missing from the lessons.

- [ ] **Step 3: Extend `buildCoursePath`**

In `src/lib/curriculum-path.ts`, change the input types and the lesson mapping. Keep the existing progression logic unchanged:

```ts
  progress: { lessonId: string; warmups: Record<string, boolean>; completedAt?: Date | null }[],
  checks: {
    taskId: string;
    at?: Date;
    feedback: {
      safety_flag: boolean;
      scores: { task: number; organization: number; grammar: number; vocabulary: number };
    };
  }[],
```

Replace the `writingDone` computation and the returned lesson object:

```ts
        const passingChecks = checks.filter(
          (check) =>
            check.taskId === lesson.task.id &&
            !check.feedback.safety_flag &&
            (!lesson.task.isCheckpoint || passesCheckpoint(check.feedback.scores, false)),
        );
        const writingDone = passingChecks.length > 0;
        const done = warmupsDone && writingDone;
        const firstPass = passingChecks
          .flatMap((check) => (check.at ? [check.at.getTime()] : []))
          .sort((a, b) => a - b)[0];
        const warmupsAt = saved?.completedAt?.getTime();
        // A lesson is complete when its last requirement is met.
        const finishedAt = Math.max(warmupsAt ?? 0, firstPass ?? 0);
        const completedAt = done && finishedAt ? new Date(finishedAt).toISOString() : null;
```

Add `completedAt` to the returned lesson object, next to `warmupsDone`. At the end of the file, add:

```ts
export type CoursePathUnit = ReturnType<typeof buildCoursePath>[number];
```

- [ ] **Step 4: Write `src/lib/course-progress.ts`**

```ts
import type { CurriculumLevel, CurriculumTrack } from '@/lib/curriculum';
import type { CoursePathUnit } from '@/lib/curriculum-path';
import { weekStartUtc } from '@/lib/improvement';

export type CourseProgress = {
  track: CurriculumTrack;
  lessonsDone: number;
  lessonsTotal: number;
  unitsDone: number;
  unitsTotal: number;
  doneThisWeek: number;
  levels: { level: CurriculumLevel; done: number; total: number }[];
  current: {
    lessonId: string;
    lessonTitle: string;
    unitTitle: string;
    level: CurriculumLevel;
    taskId: string;
    warmupsDone: boolean;
  } | null;
  recent: { lessonId: string; title: string; completedAt: string }[];
};

const recentCount = 5;

export function summarizeCourse(
  units: CoursePathUnit[],
  track: CurriculumTrack,
  now = new Date(),
): CourseProgress {
  const lessons = units.flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson })));
  const done = lessons.filter(({ lesson }) => lesson.state === 'done');
  const thisWeek = weekStartUtc(now.toISOString());
  const levels = new Map<CurriculumLevel, { done: number; total: number }>();
  for (const { unit, lesson } of lessons) {
    const level = levels.get(unit.level) ?? { done: 0, total: 0 };
    level.total++;
    if (lesson.state === 'done') level.done++;
    levels.set(unit.level, level);
  }
  const current = lessons.find(({ lesson }) => lesson.state === 'current');
  return {
    track,
    lessonsDone: done.length,
    lessonsTotal: lessons.length,
    unitsDone: units.filter((unit) => unit.lessons.every((lesson) => lesson.state === 'done')).length,
    unitsTotal: units.length,
    doneThisWeek: done.filter(
      ({ lesson }) => lesson.completedAt && weekStartUtc(lesson.completedAt) === thisWeek,
    ).length,
    levels: [...levels].map(([level, counts]) => ({ level, ...counts })),
    current: current
      ? {
          lessonId: current.lesson.id,
          lessonTitle: current.lesson.title,
          unitTitle: current.unit.title,
          level: current.unit.level,
          taskId: current.lesson.task.id,
          warmupsDone: current.lesson.warmupsDone,
        }
      : null,
    recent: done
      .flatMap(({ lesson }) =>
        lesson.completedAt
          ? [{ lessonId: lesson.id, title: lesson.title, completedAt: lesson.completedAt }]
          : [],
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, recentCount),
  };
}
```

If `CurriculumLevel` is not exported from `@/lib/curriculum` under that name, use the name that `src/lib/db/curriculum.ts` imports.

- [ ] **Step 5: Write `src/lib/next-task.ts`**

```ts
import type { CurriculumLevel, CurriculumUnit } from '@/lib/curriculum';
import type { CoursePathUnit } from '@/lib/curriculum-path';

export type NextTask =
  | {
      kind: 'lesson';
      level: CurriculumLevel;
      unitTitle: string;
      lessonTitle: string;
      prompt: string;
      minWords: number;
      maxWords: number;
      focus: CurriculumUnit['grammarFocus'];
      href: string;
      warmupsDone: boolean;
    }
  | { kind: 'placement'; href: '/placement' }
  | { kind: 'weekend'; href: '/write/weekend' };

const weekend = { kind: 'weekend', href: '/write/weekend' } as const;

// Today follows the Core path. Without seeded lessons, or after the last lesson, keep the weekend task.
export function nextTask(path?: {
  chosenLevel: CurriculumLevel | null;
  units: CoursePathUnit[];
}): NextTask {
  if (!path?.units.length) return weekend;
  if (!path.chosenLevel) return { kind: 'placement', href: '/placement' };
  for (const unit of path.units) {
    const lesson = unit.lessons.find((item) => item.state === 'current');
    if (!lesson) continue;
    return {
      kind: 'lesson',
      level: unit.level,
      unitTitle: unit.title,
      lessonTitle: lesson.title,
      prompt: lesson.task.prompt,
      minWords: lesson.task.minWords,
      maxWords: lesson.task.maxWords,
      focus: unit.grammarFocus,
      href: lesson.warmupsDone ? '/write/' + lesson.task.id : '/lesson/' + lesson.id,
      warmupsDone: lesson.warmupsDone,
    };
  }
  return weekend;
}
```

- [ ] **Step 6: Run the tests to verify that they pass**

Run: `npx vitest run tests/course-progress.test.ts tests/next-task.test.ts tests/course-progression.test.ts tests/curriculum-tracks.test.ts`
Expected: PASS. The two existing suites prove that the progression rules did not change.

- [ ] **Step 7: Format, check and commit**

```bash
npm run format && npm run check
git add src/lib/curriculum-path.ts src/lib/course-progress.ts src/lib/next-task.ts tests/course-progress.test.ts tests/next-task.test.ts
git commit -m "Summarize course completion and choose Today's next lesson"
```

---

### Task 3: Load improvement and course data from the database

**Files:**
- Modify: `src/lib/db/curriculum.ts` (`pathInTransaction`)
- Modify: `src/lib/db/progress.ts`
- Test: `tests/progress-database.test.ts` (new, PGlite)

**Interfaces:**
- Consumes: `summarizeImprovement`, `CheckEvent` (Task 1), `summarizeCourse` (Task 2), `pathInTransaction(database, track)`.
- Produces:
  ```ts
  // src/lib/db/progress.ts
  export type ProgressReport = ProgressSummary & { improvement: Improvement };
  export type ProgressPageData = ProgressReport & { course: { core: CourseProgress; ielts: CourseProgress } };
  export async function progressInTransaction(database: Transaction): Promise<ProgressReport>;
  export function loadProgress(userId: string): Promise<ProgressPageData>;
  ```
  `GET /api/progress` returns `ProgressPageData` without a route change, because the route already returns `loadProgress()`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/progress-database.test.ts`. It uses the same PGlite and owner-RLS pattern as `tests/course-progression.test.ts`, with the full schema list from `tests/today-database.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { loadProgress } from '@/lib/db/progress';

const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000091';
const bob = '00000000-0000-4000-8000-000000000092';
const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);
const ielts = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8')),
);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  withUserDatabase: (userId: string, work: (transaction: unknown) => Promise<unknown>) =>
    drizzle(database).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    }),
}));

let submissionNumber = 0;
async function addCheck(
  owner: string,
  daysAgo: number,
  scores: number,
  options: { attempt?: number; parent?: string; safety?: boolean; taskId?: string } = {},
) {
  submissionNumber++;
  const id = `00000000-0000-4000-8000-${String(submissionNumber).padStart(12, '0')}`;
  await database.query(
    `INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,parent_submission_id,status,created_at)
     VALUES ($1,$2,$3,'Synthetic text',50,$4,$5,'completed',now() - ($6 || ' days')::interval)`,
    [id, owner, options.taskId ?? 'weekend', options.attempt ?? 1, options.parent ?? null, daysAgo],
  );
  await database.query(
    `INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')`,
    [
      id,
      owner,
      JSON.stringify({
        ...markedPageSample,
        scores: { task: scores, organization: scores, grammar: scores, vocabulary: scores },
        corrections: [],
        safety_flag: options.safety ?? false,
      }),
    ],
  );
  return id;
}

beforeAll(async () => {
  await database.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES ('${alice}'), ('${bob}');`);
  for (const migration of [
    '0000_writing.sql',
    '0002_recoverable_checks.sql',
    '0003_correction_explanations.sql',
    '0004_practice.sql',
    '0005_correction_choices.sql',
    '0006_preferences.sql',
    '0007_profiles.sql',
    '0008_curriculum.sql',
    '0009_writing_course.sql',
  ])
    await database.exec(await readFile(`drizzle/${migration}`, 'utf8'));
  for (const unit of [...course, ...ielts])
    await database.query('INSERT INTO writing.curriculum_units VALUES ($1,$2,$3,$4,$5,now(),$6)', [
      unit.id,
      unit.level,
      unit.order,
      JSON.stringify(unit),
      'Synthetic test only',
      'test-hash',
    ]);
  await database.query(
    "INSERT INTO writing.placement_results(user_id,status,result,chosen_level) VALUES ($1,'completed',$2,'PRE_A1')",
    [alice, JSON.stringify({ cefr: 'A1', confidence: 0.5, reason: 'Synthetic test', safety_flag: false })],
  );
  for (const [index, score] of [2, 2, 2, 3, 4, 4].entries()) await addCheck(alice, 20 - index * 3, score);
  const parent = await addCheck(alice, 1, 2);
  await addCheck(alice, 0, 4, { attempt: 2, parent });
  await addCheck(alice, 0, 5, { safety: true });
  await addCheck(bob, 2, 1);
});
afterAll(() => database.close());

it('reports first-attempt improvement, revision gain, and course progress for the owner only', async () => {
  const report = await loadProgress(alice);
  expect(report.improvement.firstChecks).toBe(7);
  expect(report.improvement.thenVsNow?.then.average).toBe(2);
  expect(report.improvement.thenVsNow?.now.average).toBeCloseTo(3.3, 1);
  expect(report.improvement.revisionGain).toEqual({ pairs: 1, averageDelta: 2 });
  expect(report.improvement.weekly.reduce((sum, week) => sum + week.checks, 0)).toBe(7);
  expect(report.course.core).toMatchObject({ lessonsDone: 0, lessonsTotal: 63 });
  expect(report.course.core.current?.lessonId).toBe(course[0].lessons[0].id);
  expect(report.course.ielts.lessonsTotal).toBe(24);
  const other = await loadProgress(bob);
  expect(other.improvement.firstChecks).toBe(1);
  expect(other.course.core.current).toBeNull();
});
```

This `placement_results` insert is the same as in `tests/course-progression.test.ts`. The other columns have database defaults. Alice has 7 first attempts. The safety-flagged check is excluded. "Then" is the scores 2, 2 and 2, so the average is 2. "Now" is the scores 4, 4 and 2, so the average is 3.3. The revision gain is 4 − 2 = 2.

- [ ] **Step 2: Run the test to verify that it fails**

Run: `npx vitest run tests/progress-database.test.ts`
Expected: FAIL, because `improvement` and `course` are undefined.

- [ ] **Step 3: Pass times into the path**

In `src/lib/db/curriculum.ts` `pathInTransaction`, add `at: submissions.createdAt` to the `checks` select:

```ts
  const checks = await database
    .select({ taskId: submissions.taskId, at: submissions.createdAt, feedback: feedbackRows.json })
```

The `progress` rows already contain `completedAt` (a `Date` or `null`), so `buildCoursePath(content, chosenLevel, progress, checks, track)` needs no other change.

- [ ] **Step 4: Extend the progress loader**

Replace `src/lib/db/progress.ts` with:

```ts
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import { submissions, feedbackRows, practiceAnswers, practiceDrills } from './schema';
import { pathInTransaction } from './curriculum';
import { summarizeProgress, type ProgressSummary } from '@/lib/progress';
import { summarizeImprovement, type Improvement } from '@/lib/improvement';
import { summarizeCourse, type CourseProgress } from '@/lib/course-progress';

export type ProgressReport = ProgressSummary & { improvement: Improvement };
export type ProgressPageData = ProgressReport & {
  course: { core: CourseProgress; ielts: CourseProgress };
};

export function loadProgress(userId: string): Promise<ProgressPageData> {
  return withUserDatabase(userId, async (database) => {
    const now = new Date();
    const report = await progressInTransaction(database, now);
    const core = await pathInTransaction(database, 'core');
    const ielts = await pathInTransaction(database, 'ielts');
    return {
      ...report,
      course: {
        core: summarizeCourse(core.units, 'core', now),
        ielts: summarizeCourse(ielts.units, 'ielts', now),
      },
    };
  });
}
export async function progressInTransaction(
  database: Transaction,
  now = new Date(),
): Promise<ProgressReport> {
  const writing = await database
    .select({
      id: submissions.id,
      at: submissions.createdAt,
      words: submissions.wordCount,
      attempt: submissions.attempt,
      parentId: submissions.parentSubmissionId,
      feedback: feedbackRows.json,
    })
    .from(submissions)
    .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
    .where(
      and(eq(submissions.status, 'completed'), sql`${feedbackRows.json}->>'safety_flag' = 'false'`),
    );
  const practice = await database
    .select({
      at: practiceAnswers.createdAt,
      result: practiceAnswers.result,
      payload: practiceDrills.payload,
    })
    .from(practiceAnswers)
    .innerJoin(practiceDrills, eq(practiceAnswers.drillId, practiceDrills.id));
  const summary = summarizeProgress(
    writing.map((row) => ({
      at: row.at.toISOString(),
      words: row.words,
      level: row.feedback.cefr_estimate,
      corrections: row.feedback.corrections,
    })),
    practice.map((row) => ({
      at: row.at.toISOString(),
      correct: row.result.correct,
      complete: row.result.complete,
      tag: row.payload.tag,
      box: row.result.box,
    })),
    now,
  );
  const improvement = summarizeImprovement(
    writing.map((row) => ({
      id: row.id,
      at: row.at.toISOString(),
      attempt: row.attempt,
      parentId: row.parentId,
      words: row.words,
      scores: row.feedback.scores,
      corrections: row.feedback.corrections,
    })),
    now,
  );
  return { ...summary, improvement };
}
```

`loadToday` (`src/lib/db/today.ts`) calls `progressInTransaction(database)`, so Today receives `improvement` automatically. The Today page does not need `course`, so it does not run the two extra path queries.

- [ ] **Step 5: Run the tests to verify that they pass**

Run: `npx vitest run tests/progress-database.test.ts tests/today-database.test.ts tests/progress.test.ts tests/course-progression.test.ts`
Expected: PASS.

- [ ] **Step 6: Update the preview fixtures so that the types compile**

In `src/mocks/progress.sample.ts`, keep `progressSample` and add the new fields. Use realistic synthetic checks:

```ts
import { summarizeProgress } from '@/lib/progress';
import { summarizeImprovement, type CheckEvent } from '@/lib/improvement';
import { summarizeCourse } from '@/lib/course-progress';
import { pathSample } from '@/mocks/curriculum.sample';
import type { ProgressPageData } from '@/lib/db/progress';

const now = new Date('2026-10-15T12:00:00Z');
// Day, task, organization, grammar, vocabulary, counted errors.
const rows: [string, number, number, number, number, number][] = [
  ['2026-09-22', 2, 2, 1, 2, 6],
  ['2026-09-24', 2, 3, 2, 2, 5],
  ['2026-09-29', 3, 2, 2, 3, 5],
  ['2026-10-02', 3, 3, 2, 3, 4],
  ['2026-10-06', 3, 3, 3, 3, 3],
  ['2026-10-09', 4, 3, 3, 3, 3],
  ['2026-10-13', 4, 4, 3, 4, 2],
  ['2026-10-14', 4, 4, 4, 4, 1],
];
const checks: CheckEvent[] = rows.map(
  ([day, task, organization, grammar, vocabulary, errors], index) => ({
    id: 'sample-' + index,
    at: day + 'T10:00:00Z',
    attempt: 1,
    parentId: null,
    words: 80,
    scores: { task, organization, grammar, vocabulary },
    corrections: Array.from({ length: errors }, () => ({
      confidence: 0.9,
      severity: 'major' as const,
    })),
  }),
);
checks.push({
  ...checks[7],
  id: 'sample-revision',
  at: '2026-10-14T11:00:00Z',
  attempt: 2,
  parentId: 'sample-7',
  scores: { task: 5, organization: 4, grammar: 5, vocabulary: 4 },
});
```

Then build `progressSample: ProgressPageData` as the existing `summarizeProgress(...)` result, spread with `improvement: summarizeImprovement(checks, now)` and `course: { core: summarizeCourse(pathSample.units, 'core', now), ielts: summarizeCourse([], 'ielts', now) }`. Keep the existing writing events for `summarizeProgress` unchanged, so `tests/e2e/progress.spec.ts` and `today-progress.spec.ts` keep their numbers.

Also export `progressEmptySample: ProgressPageData`. It uses the same summary with `improvement: summarizeImprovement([], now)` and the same `course`.

In `src/mocks/today.sample.ts`, spread `improvement: summarizeImprovement([], new Date('2026-10-14T12:00:00Z'))` into `todayProgressSample`.

Run `npm run typecheck`. Fix every place where the compiler reports a missing `improvement`, by typing that prop as `ProgressReport`. The likely places are `Today.tsx`, `AccountActivity.tsx` and `src/app/dev/preview/[screen]/page.tsx`. `Progress.tsx` fetches `ProgressPageData`.

- [ ] **Step 7: Format, check and commit**

```bash
npm run format && npm run check
git add src/lib/db/progress.ts src/lib/db/curriculum.ts src/mocks tests/progress-database.test.ts src/components/today src/components/progress src/app/dev/preview
git commit -m "Load first-attempt improvement and course completion with progress"
```

---

### Task 4: Progress page — "Your improvement" and course sections

**Files:**
- Create: `src/components/progress/Improvement.tsx`
- Create: `src/components/progress/CourseProgress.tsx`
- Modify: `src/components/progress/Progress.tsx` (render them; data type `ProgressPageData`)
- Modify: `src/app/dev/preview/[screen]/page.tsx`, `src/app/dev/preview/progress-data/route.ts` (an empty variant)
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `tests/e2e/progress-improvement.spec.ts`

**Interfaces:**
- Consumes: `ProgressPageData`, `Improvement`, `SkillSnapshot`, `scoreKeys`, `CourseProgress`.
- Produces: `<Improvement data={Improvement} />` and `<CourseProgressPanel course={ProgressPageData['course']} preview={boolean} />`.

**Design:**
- Order on `/progress`: the stats row (unchanged), then **Your improvement**, then **Your course**, then the existing panels (level, error groups, calendar), then review insights.
- **Your improvement** has three parts:
  1. **Then vs now** card. One row per skill (`task`, `organization`, `grammar`, `vocabulary`), plus "Average" and "Errors per 100 words". Each row shows `then → now` and a change chip. A rising score is good, and a falling error rate is good. Use the `success` color for an improvement and `text.secondary` for no change. **Never use red for a decline.** Show it neutrally as "−0.3". Header text: "Your first 3 checks compared with your latest 3".
  2. **Weekly scores** line chart: `@mui/x-charts/LineChart`, the x axis is `weekStart` (time scale, UTC formatter), the y axis is 0–5, with four series, one per skill. Add a second small chart or line for errors per 100 words. Show charts only when `weekly.length >= 2`. With one week, show only the then-vs-now card or the empty message.
  3. **Revision gain** line: "Your revisions scored +0.8 on average (4 revisions)." Format `delta` with `signDisplay: 'exceptZero'` and one decimal. Show the line only when `revisionGain` is not null.
- Empty state, when `thenVsNow === null`: "Write {n} more checked pieces to see how you are improving." Use `checksNeeded`, and use ICU plural rules for `n`.
- Disclaimer, always shown: "Scores are 0–5 practice scores from first attempts. They are not CEFR or IELTS results."
- **Your course**: one card per track that has lessons. Each card shows "Core path: 12 of 63 lessons", a `LinearProgress`, one compact row per level ("A2 · 4/9"), "3 lessons this week", a "Continue: {lessonTitle}" button (href `/lesson/{lessonId}`, or `/write/{taskId}` when `warmupsDone`), and the last 3 completed lessons with UTC dates. If `current === null` and `lessonsDone === 0` for Core, show a "Find your starting level" button that links to `/placement`. In preview, every href points to `/dev/preview/path`.
- Accessibility: every chart has `aria-label` text that summarizes the trend in words, for example "Average score rose from 2.2 to 3.7". The then-vs-now rows are a `Table` with a real `<th>` header row.

- [ ] **Step 1: Add the strings**

Add to `messages/en.json`, under `"progress"`:

```json
"improvementTitle": "Your improvement",
"thenVsNow": "Your first 3 checks compared with your latest 3",
"skill": "Skill",
"then": "Then",
"now": "Now",
"change": "Change",
"task": "Task",
"organization": "Organization",
"grammar": "Grammar",
"vocabulary": "Vocabulary",
"average": "Average",
"errorRate": "Errors per 100 words",
"weeklyScores": "Weekly scores",
"weeklyErrors": "Errors per 100 words, by week",
"trendSummary": "Average score went from {then} to {now}.",
"revisionGain": "Your revisions scored {delta} on average ({n, plural, one {# revision} other {# revisions}}).",
"checksNeeded": "Write {n, plural, one {# more checked piece} other {# more checked pieces}} to see how you are improving.",
"improvementDisclaimer": "Scores are 0–5 practice scores from first attempts. They are not CEFR or IELTS results.",
"courseTitle": "Your course",
"coreTrack": "Core path",
"ieltsTrack": "IELTS workspace",
"lessonsDone": "{done} of {total} lessons",
"lessonsThisWeek": "{n, plural, =0 {No lessons this week} one {# lesson this week} other {# lessons this week}}",
"levelCount": "{level} · {done}/{total}",
"continueLesson": "Continue: {title}",
"findLevel": "Find your starting level",
"recentLessons": "Recently completed"
```

Add the same keys to `messages/vi.json` with Vietnamese text. Ask a Vietnamese speaker to review the strings before release. Mark this as unreviewed in your final report.

```json
"improvementTitle": "Sự tiến bộ của bạn",
"thenVsNow": "3 bài chấm đầu tiên so với 3 bài gần nhất",
"skill": "Kỹ năng",
"then": "Trước",
"now": "Hiện tại",
"change": "Thay đổi",
"task": "Hoàn thành yêu cầu",
"organization": "Bố cục",
"grammar": "Ngữ pháp",
"vocabulary": "Từ vựng",
"average": "Trung bình",
"errorRate": "Số lỗi trên 100 từ",
"weeklyScores": "Điểm theo tuần",
"weeklyErrors": "Số lỗi trên 100 từ theo tuần",
"trendSummary": "Điểm trung bình đã thay đổi từ {then} lên {now}.",
"revisionGain": "Các bản sửa của bạn tăng trung bình {delta} điểm ({n} bản sửa).",
"checksNeeded": "Hãy viết thêm {n} bài được chấm để xem bạn tiến bộ thế nào.",
"improvementDisclaimer": "Điểm là điểm luyện tập 0–5 từ lần nộp đầu tiên. Đây không phải kết quả CEFR hay IELTS.",
"courseTitle": "Khóa học của bạn",
"coreTrack": "Lộ trình chính",
"ieltsTrack": "Khu luyện IELTS",
"lessonsDone": "{done}/{total} bài học",
"lessonsThisWeek": "{n, plural, =0 {Chưa có bài học nào tuần này} other {# bài học tuần này}}",
"levelCount": "{level} · {done}/{total}",
"continueLesson": "Tiếp tục: {title}",
"findLevel": "Tìm trình độ bắt đầu",
"recentLessons": "Vừa hoàn thành"
```

If `progress.task`, `progress.grammar` or a similar key already exists with a different meaning, prefix the new keys with `skill` (for example `skillTask`). Then use those names in the components.

- [ ] **Step 2: Write the failing e2e test**

Create `tests/e2e/progress-improvement.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Progress compares first and latest checks and shows course completion', async ({ page }) => {
  await page.goto('/dev/preview/progress');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toBeVisible();
  const table = improvement.getByRole('table');
  await expect(table.getByRole('row', { name: /Grammar/ })).toContainText('1.7');
  await expect(table.getByRole('row', { name: /Grammar/ })).toContainText('3.3');
  await expect(table.getByRole('row', { name: /Errors per 100 words/ })).toBeVisible();
  await expect(improvement.getByText('Average score went from', { exact: false })).toBeVisible();
  await expect(improvement.getByText(/Your revisions scored \+/)).toBeVisible();
  await expect(improvement.getByText(/not CEFR or IELTS results/)).toBeVisible();
  const course = page.getByRole('region', { name: 'Your course' });
  await expect(course.getByText(/of 63 lessons/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty state: Progress asks for more checks instead of an empty chart', async ({ page }) => {
  await page.goto('/dev/preview/progress-empty');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toContainText('Write 6 more checked pieces to see how you are improving.');
  await expect(improvement.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('NaN')).toHaveCount(0);
});
```

The values come from the sample in Task 3, Step 6. "Then" is the first three first attempts, so grammar = (1+2+2)/3 = 1.7. "Now" is the last three (2026-10-09, -13 and -14), so grammar = (3+3+4)/3 = 3.3. The revision scores 4.5 against its parent's 4, which displays as "+0.5". If you change the sample, recalculate these numbers and change the test, not the code.

- [ ] **Step 3: Run the test to verify that it fails**

Run: `npx playwright test tests/e2e/progress-improvement.spec.ts`
Expected: FAIL. The region "Your improvement" does not exist.

- [ ] **Step 4: Add the preview variant**

In `src/app/dev/preview/progress-data/route.ts`, return `progressEmptySample` when `new URL(request.url).searchParams.get('variant') === 'empty'`, and `progressSample` otherwise. Change the handler signature to `GET(request: Request)`.

In `Progress.tsx`, add an optional prop `variant?: 'empty'` and append `?variant=empty` to the preview fetch URL. In `src/app/dev/preview/[screen]/page.tsx`, add:

```tsx
  if (screen === 'progress-empty') return <Progress preview variant="empty" />;
```

- [ ] **Step 5: Write `Improvement.tsx`**

Rules:
- The root is `<Paper component="section" aria-labelledby="improvement-title" sx={{ p: 3 }}>` with `<Typography id="improvement-title" variant="h2">`.
- Use small named components: `ThenVsNowTable`, `ChangeChip`, `WeeklyScoreChart`, `WeeklyErrorChart`, `RevisionGainNote`.
- `ChangeChip({ delta, lowerIsBetter })`: `delta > 0` (or `< 0` when lower is better) → `<Chip color="success" variant="tonal" label="+0.4" />`. A zero → label "0", `variant="outlined"`. A decline → `variant="outlined"` with the signed number, and no error color. Format with `useFormatter().number(delta, { signDisplay: 'exceptZero', maximumFractionDigits: 1 })`.
- `WeeklyScoreChart`: copy the `LineChart` setup from `ProgressPanels` in `Progress.tsx` (time x-axis, UTC `valueFormatter`, `skipAnimation={reducedMotion}`). Use `yAxis={[{ min: 0, max: 5, tickInterval: [0, 1, 2, 3, 4, 5] }]}` and one series per `scoreKeys` entry, with `label: t(key)`. Take colors from `theme.palette` (`primary`, `success`, `warning`, `info`), never hex. Wrap the chart in `<Box role="img" aria-label={t('trendSummary', ...)}>`.
- `WeeklyErrorChart`: the same, with one series `errorsPer100Words` and `yAxis` `min: 0`.
- Render charts only if `data.weekly.length >= 2`.
- Always render the disclaimer as `<Typography variant="caption" color="text.secondary">`.

- [ ] **Step 6: Write `CourseProgress.tsx`**

Export `CourseProgressPanel({ course, preview })`. The root is `<Box component="section" aria-labelledby="course-title">` with an `h2`. Render one `Card` per track where `lessonsTotal > 0`, using the design above. Use small named components `TrackCard`, `LevelRows` and `RecentLessons`. Format dates with `useFormatter().dateTime(new Date(completedAt), { month: 'short', day: 'numeric', timeZone: 'UTC' })`.

- [ ] **Step 7: Render both sections in `ProgressPanels`**

In `src/components/progress/Progress.tsx`, change the `data` type to `ProgressPageData`. Insert `<Improvement data={data.improvement} />` and `<CourseProgressPanel course={data.course} preview={preview} />` directly after the stats row. Pass `preview` down from `Progress` to `ProgressPanels`.

- [ ] **Step 8: Run the tests to verify that they pass**

Run: `npx playwright test tests/e2e/progress-improvement.spec.ts tests/e2e/progress.spec.ts tests/e2e/progress-motion.spec.ts`
Expected: PASS on the desktop and mobile projects.

- [ ] **Step 9: Capture screenshots**

Capture `/dev/preview/progress` at 1440×1000 and 390×844, and in dark mode on mobile. Save them as `docs/verification/ux/screenshots/progress-improvement-{desktop,mobile,dark-mobile}.png`. Look at each screenshot. Check that nothing overflows horizontally, that the chart legends are readable, and that nothing uses red for a decline.

- [ ] **Step 10: Format, check and commit**

```bash
npm run format && npm run check
git add src/components/progress messages src/app/dev/preview tests/e2e/progress-improvement.spec.ts docs/verification/ux/screenshots/progress-improvement-*.png
git commit -m "Show first-to-latest improvement and course completion on Progress"
```

---

### Task 5: Today — the next lesson, "goal met" and an improvement highlight

**Files:**
- Modify: `src/components/today/Today.tsx` (`NextTaskCard`)
- Modify: `src/components/today/AccountActivity.tsx`
- Modify: `src/app/today/page.tsx`
- Modify: `src/mocks/today.sample.ts`, `src/app/dev/preview/[screen]/page.tsx`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `tests/e2e/today-next-task.spec.ts`

**Interfaces:**
- Consumes: `NextTask`, `nextTask()` (Task 2), `ProgressReport` (Task 3), `scoreKeys`.
- Produces: `Today` gets a new prop `next?: NextTask`. `AccountActivity` reads `progress.improvement`.

**Design:**
- `NextTaskCard({ next, preview })`:
  - `kind: 'lesson'`: the chip shows `next.level`, the title is `next.lessonTitle`, the subtitle is `next.unitTitle`, the description is `next.prompt` (clamped to 3 lines with `display: '-webkit-box'`, `WebkitLineClamp: 3`, `WebkitBoxOrient: 'vertical'`, `overflow: 'hidden'`), and the word range is `{min}–{max} words`. The button reads "Start lesson" when `!warmupsDone` and "Continue writing" otherwise. The focus line is "Your focus: " plus the unit's `focus` tags, translated with `useTranslations('feedback.tags')` (the same as `LearningPath.tsx`) and joined with `useFormatter().list(...)`. **Remove the italic opening box ("Hi Maria! Last weekend…") for lessons.** Keep it only for `kind: 'weekend'`.
  - `kind: 'placement'`: the title is "Find your starting level", the body explains one short writing sample, and the button "Start placement" links to `/placement`.
  - `kind: 'weekend'` or `next` undefined: the current card, unchanged (existing strings).
  - Preview: every href goes to `/dev/preview/write`, as today.
- `AccountActivity`:
  - When `weeklySessions >= goal`, the ring center shows `{done}` with the caption "Goal met" (`today.goalMet`). The ring `aria-label` is `today.weeklyCountMet`: "{done} sessions this week. Goal of {goal} met." When below the goal, nothing changes.
  - **Improvement highlight**, in the right column above "See all progress": pick the `scoreKeys` entry with the largest positive `now - then` from `progress.improvement.thenVsNow`. Show "{skill}: {then} → {now} since your first checks" (`today.improving`). If `thenVsNow` is null, show `today.keepWriting`: "Write {n} more checked pieces to see your progress." If no skill improved, show `today.steady`: "Your scores are steady. Keep revising to push them up." Keep the existing "Revisions count toward your weekly goal." line.

- [ ] **Step 1: Add the strings**

`messages/en.json` → `"today"`:

```json
"lessonWordRange": "{min}–{max} words",
"startLesson": "Start lesson",
"continueWriting": "Continue writing",
"lessonFocus": "Your focus: {tags}",
"placementTitle": "Find your starting level",
"placementBody": "Write one short sample. We suggest where to start, and you can change it.",
"startPlacement": "Start placement",
"goalMet": "Goal met",
"weeklyCountMet": "{done} sessions this week. Goal of {goal} met.",
"improving": "{skill}: {then} → {now} since your first checks",
"keepWriting": "Write {n, plural, one {# more checked piece} other {# more checked pieces}} to see your progress.",
"steady": "Your scores are steady. Keep revising to push them up."
```

`messages/vi.json` → `"today"`:

```json
"lessonWordRange": "{min}–{max} từ",
"startLesson": "Bắt đầu bài học",
"continueWriting": "Tiếp tục viết",
"lessonFocus": "Trọng tâm: {tags}",
"placementTitle": "Tìm trình độ bắt đầu",
"placementBody": "Viết một đoạn ngắn. Chúng tôi gợi ý điểm bắt đầu, và bạn có thể thay đổi.",
"startPlacement": "Bắt đầu kiểm tra trình độ",
"goalMet": "Đã đạt mục tiêu",
"weeklyCountMet": "{done} buổi viết tuần này. Đã đạt mục tiêu {goal}.",
"improving": "{skill}: {then} → {now} kể từ những bài đầu tiên",
"keepWriting": "Hãy viết thêm {n} bài được chấm để xem sự tiến bộ.",
"steady": "Điểm của bạn đang ổn định. Hãy tiếp tục sửa bài để nâng điểm."
```

The highlight's skill names reuse the `progress.task`/`grammar`/... keys from Task 4.

- [ ] **Step 2: Add the preview data**

In `src/mocks/today.sample.ts`, add:

```ts
import { nextTask } from '@/lib/next-task';
import { pathSample } from '@/mocks/curriculum.sample';
export const todayNextSample = nextTask(pathSample);
```

Check that `pathSample` has a `chosenLevel` and a `current` lesson, so the result is `kind: 'lesson'`. If not, build the sample with `buildCoursePath(course units from pathSample, 'A2', [], [], 'core')`.

In `src/app/dev/preview/[screen]/page.tsx`:
- Pass `next={todayNextSample}` to the `today` screen.
- Add a `today-placement` screen: `<Today preview progress={todayProgressSample} next={{ kind: 'placement', href: '/placement' }} />`.
- Add a `today-goal-met` screen. It uses a progress sample with 10 sessions this week and goal 5: build it with `summarizeProgress` from 10 events dated in the current sample week, then spread `improvement: progressSample.improvement`.

- [ ] **Step 3: Write the failing e2e test**

Create `tests/e2e/today-next-task.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Today offers the current lesson instead of a fixed weekend task', async ({ page }) => {
  await page.goto('/dev/preview/today');
  const card = page.getByTestId('today-task');
  await expect(card).not.toContainText('Tell a friend about your weekend');
  await expect(card).not.toContainText('Hi Maria! Last weekend…');
  await expect(card.getByText(/^Your focus: /)).toBeVisible();
  await expect(card.getByText(/\d+–\d+ words/)).toBeVisible();
  await expect(card.getByRole('link', { name: /Start lesson|Continue writing/ })).toBeVisible();
});

test('Today asks for placement before the first lesson', async ({ page }) => {
  await page.goto('/dev/preview/today-placement');
  const card = page.getByTestId('today-task');
  await expect(card.getByRole('heading', { name: 'Find your starting level' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Start placement' })).toBeVisible();
});

test('goal met: the weekly ring never shows more sessions than the goal as "10 of 5"', async ({ page }) => {
  await page.goto('/dev/preview/today-goal-met');
  await expect(page.getByRole('img', { name: '10 sessions this week. Goal of 5 met.' })).toBeVisible();
  await expect(page.getByText('10 of 5')).toHaveCount(0);
  await expect(page.getByText('Goal met', { exact: true })).toBeVisible();
});

test('Today shows the strongest improvement from the progress report', async ({ page }) => {
  await page.goto('/dev/preview/today-goal-met');
  await expect(page.getByText(/since your first checks$/)).toBeVisible();
});
```

- [ ] **Step 4: Run the test to verify that it fails**

Run: `npx playwright test tests/e2e/today-next-task.spec.ts`
Expected: FAIL.

- [ ] **Step 5: Implement**

1. In `src/app/today/page.tsx`, import `nextTask`, and pass `next={nextTask(learningPath)}` to `<Today>`.
2. Add `next?: NextTask` to the `Today` props and pass it to `NextTaskCard`.
3. Split `NextTaskCard` into small named components: `LessonTaskCard`, `PlacementTaskCard` and `WeekendTaskCard`. The weekend card is the existing JSX, unchanged. `NextTaskCard` only selects one by `next?.kind`. Keep `data-testid="today-task"` on the outer `Card` of all three.
4. In `AccountActivity`, add `goalMet = progress.weeklySessions >= goal`, and choose the ring text and `aria-label` from it. Add a named component `ImprovementHighlight({ improvement })` that implements the rule in **Design**.

- [ ] **Step 6: Run the tests to verify that they pass**

Run: `npx playwright test tests/e2e/today-next-task.spec.ts tests/e2e/today-progress.spec.ts tests/e2e/today-design.spec.ts tests/e2e/today-motion.spec.ts tests/e2e/weekly-goal.spec.ts tests/e2e/curriculum-tracks.spec.ts`
Expected: PASS. If an existing Today test asserted the old hardcoded title, update that test only when the preview it uses now gets `next`. State this in the commit message.

- [ ] **Step 7: Check the real data flow once**

Signed in with a real account in `npm run dev`:
- Without placement, Today shows "Find your starting level".
- After placement, Today shows the first lesson of the chosen level.
- After you finish its warm-ups, the button reads "Continue writing" and links to `/write/{taskId}`.
- After a passing check, Today shows the next lesson, and `/progress` shows "1 of 63 lessons".

Record these results in the final report. Mark any step you could not run as untested.

- [ ] **Step 8: Capture screenshots**

Capture `/dev/preview/today` and `/dev/preview/today-goal-met` at 1440×1000 and 390×844. Save them as `docs/verification/ux/screenshots/today-next-task-{desktop,mobile}.png` and `today-goal-met-{desktop,mobile}.png`.

- [ ] **Step 9: Format, check and commit**

```bash
npm run format && npm run check
git add src/components/today src/app/today/page.tsx src/mocks/today.sample.ts src/app/dev/preview messages tests/e2e/today-next-task.spec.ts docs/verification/ux/screenshots/today-*.png
git commit -m "Drive Today from the learning path and show goal and improvement status"
```

---

### Task 6: Full verification and status

**Files:**
- Modify: `PROJECT.md` (§0 Status and the feature status rows for Today and Progress)

- [ ] **Step 1: Run the full checks**

```bash
npm run check
npx playwright test
npm run build
```

Expected: everything passes, with one known exception. The "unconfigured sign-in" tests in `tests/e2e/backend.spec.ts` and `tests/e2e/ux.spec.ts` fail when the dev server reads a configured `.env`. Run them against an unconfigured server, or report them as an environment limit, not a pass.

- [ ] **Step 2: Update `PROJECT.md`**

- In §0, add one line for this slice: "Progress: first-attempt rubric and error-rate trends, then-vs-now comparison, revision gain, and Core/IELTS course completion. Today follows the Core path (placement → lesson → writing) and shows goal-met and improvement status. No migration."
- In the feature table, change the Today row's "Remaining work" from "Personalized next task" to the remaining limits. Add the new behavior to the Progress row.
- Name the test files and the screenshot paths as evidence.

- [ ] **Step 3: Commit**

```bash
git add PROJECT.md
git commit -m "Record learner progress tracking status"
```

- [ ] **Step 4: Report**

Report in this order:
1. What changed for the learner.
2. Each check you ran and its result.
3. What remains untested. At minimum, report the Vietnamese strings (not reviewed by a native speaker) and the real signed-in flow, if Task 5 Step 7 was not run.
4. The commit hashes.

Do not push or deploy.

---

## Self-review notes (planner)

- **Spec coverage:** The "no improvement view" finding is covered by Tasks 1, 3 and 4. The "no course progress" finding is covered by Tasks 2, 3 and 4. The "Today stuck on the weekend task" finding is covered by Tasks 2 and 5. "10 of 5" is covered by Task 5.
- **Deliberately excluded (YAGNI):** a new database table or snapshot job, emails, goals per skill, comparisons with other learners, and an AI-written progress narrative. Add them only after this slice ships and learners use it.
- **Known judgment calls that the user can change later:**
  - The comparison window is 3 checks, and the minimum is 6 first attempts.
  - Trends use first attempts only.
  - Today follows Core only. IELTS stays a separate entry card.
  - A score decline is shown neutrally, without red.
