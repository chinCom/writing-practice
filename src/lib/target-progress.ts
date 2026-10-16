import type { CurriculumLevel } from './curriculum';
import type { LocatedCorrection } from './feedback/schema';

export type TargetEvent = {
  submissionId: string;
  taskId: string;
  at: string;
  tag: LocatedCorrection['tag'];
  level: CurriculumLevel;
  uses: number;
  errors: number;
  isFirstAttempt: boolean;
  graderVersion: string;
};
export type TargetProgress = {
  tag: TargetEvent['tag'];
  level: CurriculumLevel;
  graderVersion: string;
  state: 'unknown' | 'new' | 'learning' | 'secure' | 'review-due';
  tasks: number;
  uses: number;
  errors: number;
  first: { uses: number; errors: number } | null;
  latest: { uses: number; errors: number } | null;
  nextReviewAt: string | null;
};
const reviewDays = [1, 3, 7, 14, 30];
const dayMilliseconds = 86400000;

export function summarizeTargets(events: TargetEvent[], now = new Date()): TargetProgress[] {
  const groups = new Map<string, TargetEvent[]>();
  const ordered = events
    .filter(
      (event) =>
        event.isFirstAttempt &&
        new Date(event.at) <= now &&
        Number.isInteger(event.uses) &&
        Number.isInteger(event.errors) &&
        event.uses >= 0 &&
        event.uses <= 100 &&
        event.errors >= 0 &&
        event.errors <= event.uses,
    )
    .sort((a, b) => a.at.localeCompare(b.at) || a.submissionId.localeCompare(b.submissionId));
  for (const event of ordered) {
    const key = `${event.level}:${event.tag}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const latestVersion = group.at(-1)!.graderVersion;
      const tasks = new Set<string>();
      const cohort = group.filter((event) => {
        if (event.graderVersion !== latestVersion || tasks.has(event.taskId)) return false;
        tasks.add(event.taskId);
        return true;
      });
      const last = cohort.at(-1)!;
      let successes = 0;
      let interval = 0;
      let due: number | null = null;
      let state: TargetProgress['state'] = 'unknown';
      for (const event of cohort) {
        if (event.uses === 0) {
          state = 'unknown';
          successes = 0;
          due = null;
          interval = 0;
        } else if (event.uses < 5 || event.errors > Math.max(1, event.uses * 0.2)) {
          state = 'learning';
          successes = 0;
          due = null;
          interval = 0;
        } else {
          successes++;
          const at = new Date(event.at).getTime();
          if (successes === 2) due = at + reviewDays[0] * dayMilliseconds;
          else if (due !== null && at >= due) {
            interval = Math.min(reviewDays.length - 1, interval + 1);
            due = at + reviewDays[interval] * dayMilliseconds;
          }
          state = due === null ? 'new' : 'secure';
        }
      }
      if (due !== null && due <= now.getTime()) state = 'review-due';
      const counts = (event: TargetEvent) =>
        event.uses ? { uses: event.uses, errors: event.errors } : null;
      return {
        tag: last.tag,
        level: last.level,
        graderVersion: latestVersion,
        state,
        tasks: cohort.length,
        uses: cohort.reduce((sum, event) => sum + event.uses, 0),
        errors: cohort.reduce((sum, event) => sum + event.errors, 0),
        first: counts(cohort[0]),
        latest: counts(last),
        nextReviewAt: due === null ? null : new Date(due).toISOString(),
      };
    })
    .sort((a, b) => a.level.localeCompare(b.level) || a.tag.localeCompare(b.tag));
}

export function reviewTargets(
  focus: TargetEvent['tag'][],
  level: CurriculumLevel,
  progress: TargetProgress[],
): TargetEvent['tag'][] {
  const due = progress
    .filter((target) => target.level === level && target.state === 'review-due')
    .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!) || a.tag.localeCompare(b.tag));
  return [...new Set([...focus, ...due.map((target) => target.tag)])].slice(0, 2);
}
