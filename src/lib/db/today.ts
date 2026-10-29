import 'server-only';
import { withUserDatabase } from './client';
import { recentSubmissionsInTransaction } from './queries';
import { progressHistoryInTransaction } from './progress';
import { goalFromPaths } from '@/lib/goal';
import { practiceInTransaction } from './practice';
import { preferencesInTransaction } from './preferences';
import { coursePathsInTransaction } from './curriculum';
import { profileInTransaction } from './profile';
import { goalTrack } from '@/lib/profile';

export function loadToday(userId: string) {
  // One page owns one slot. Its sections must not queue behind its own cold connections.
  return withUserDatabase(userId, async (database) => {
    const now = new Date();
    const [submissions, history, preferences, paths, profile] = await Promise.all([
      recentSubmissionsInTransaction(database),
      progressHistoryInTransaction(database, now),
      preferencesInTransaction(database, userId),
      // Both tracks come from one read, so the goal can pick its track without another round trip.
      coursePathsInTransaction(database),
      profileInTransaction(database, userId),
    ]);
    const track = profile ? goalTrack(profile.goal) : 'core';
    // Seed Practice last when its lock is free; otherwise read committed reviews.
    const practice = await practiceInTransaction(database, userId);
    const progress = history.report;
    const goal = goalFromPaths({
      profile,
      paths,
      attempts: history.attempts,
      weeklyGoal: preferences.weeklyGoal,
      weeklySessions: progress.weeklySessions,
      now,
    });
    return {
      submissions,
      progress,
      goal,
      practice,
      preferences,
      profile,
      track,
      paths,
      learningPath: paths[track],
    };
  });
}
