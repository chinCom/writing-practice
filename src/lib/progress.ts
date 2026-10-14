import type { LocatedCorrection, Feedback } from '@/lib/feedback/schema';
import { markStyle } from '@/components/feedback/mark-style';

export type WritingEvent = {
  at: string;
  words: number;
  level: Feedback['cefr_estimate'];
  corrections: Pick<LocatedCorrection, 'tag' | 'confidence' | 'severity'>[];
};
export type ReviewEvent = {
  at: string;
  correct: boolean;
  complete: boolean;
  tag?: LocatedCorrection['tag'];
  box?: number;
};
const levels = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const dayMilliseconds = 86400000;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export function summarizeProgress(
  writing: WritingEvent[],
  practice: ReviewEvent[],
  now = new Date(),
) {
  const samples = writing
    .filter((event) => new Date(event.at) <= now)
    .sort((a, b) => a.at.localeCompare(b.at));
  const reviews = practice.filter((event) => event.complete && new Date(event.at) <= now);
  const writingDays = [...new Set(samples.map((event) => event.at.slice(0, 10)))].sort();
  const days = new Set(writingDays);
  const today = new Date(dateKey(now) + 'T00:00:00Z');
  let streak = 0;
  let cursor = today.getTime();
  if (!days.has(dateKey(new Date(cursor)))) cursor -= dayMilliseconds;
  while (days.has(dateKey(new Date(cursor)))) {
    streak++;
    cursor -= dayMilliseconds;
  }
  let longestStreak = 0;
  let run = 0;
  let previous = 0;
  for (const day of writingDays) {
    const time = new Date(day).getTime();
    run = time - previous === dayMilliseconds ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = time;
  }
  const weekStart = today.getTime() - ((today.getUTCDay() + 6) % 7) * dayMilliseconds;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = dateKey(new Date(weekStart + index * dayMilliseconds));
    return { date, written: days.has(date), future: date > dateKey(now) };
  });
  const counts = new Map<ReturnType<typeof markStyle>['group'], number>();
  const tags = new Map<
    LocatedCorrection['tag'],
    { errors: number; reviews: number; correct: number; box: number }
  >();
  const tagStats = (tag: LocatedCorrection['tag']) => {
    if (!tags.has(tag)) tags.set(tag, { errors: 0, reviews: 0, correct: 0, box: 1 });
    return tags.get(tag)!;
  };
  const trajectory: { at: string; level: Feedback['cefr_estimate'] }[] = [];
  let level: Feedback['cefr_estimate'] | null = null;
  for (const [index, sample] of samples.entries()) {
    if (level === null) level = sample.level;
    const window = samples.slice(Math.max(0, index - 4), index + 1);
    const sorted = window.map((event) => levels.indexOf(event.level)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const direction = Math.sign(median - levels.indexOf(level));
    if (
      direction &&
      window.length >= 3 &&
      window
        .slice(-3)
        .every(
          (event) => Math.sign(levels.indexOf(event.level) - levels.indexOf(level!)) === direction,
        )
    ) {
      level = levels[median];
    }
    trajectory.push({ at: sample.at, level });
    for (const correction of sample.corrections) {
      if (correction.confidence < 0.7 || correction.severity === 'style') continue;
      const group = markStyle(correction.tag).group;
      counts.set(group, (counts.get(group) ?? 0) + 1);
      tagStats(correction.tag).errors++;
    }
  }
  for (const review of [...reviews].sort((a, b) => a.at.localeCompare(b.at))) {
    if (!review.tag) continue;
    const stats = tagStats(review.tag);
    stats.reviews++;
    if (review.correct) stats.correct++;
    stats.box = review.box ?? stats.box;
  }
  const words = samples.reduce((sum, sample) => sum + sample.words, 0);
  const correctReviews = reviews.filter((review) => review.correct).length;
  return {
    asOf: now.toISOString(),
    sessions: samples.length,
    words,
    skills: [...tags]
      .map(([tag, stats]) => ({
        tag,
        ...stats,
        errorsPer100Words: words ? Math.round((stats.errors / words) * 10000) / 100 : 0,
        accuracy: stats.reviews ? stats.correct / stats.reviews : null,
      }))
      .sort((a, b) => b.errors - a.errors),
    streak,
    longestStreak,
    writingDays,
    week,
    weeklySessions: samples.filter((sample) => new Date(sample.at).getTime() >= weekStart).length,
    xp: samples.length * 10 + correctReviews * 5,
    reviews: reviews.length,
    correctReviews,
    level,
    trajectory,
    errors: [...counts]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count),
  };
}
export type ProgressSummary = ReturnType<typeof summarizeProgress>;
