import 'server-only';
import { withUserDatabase } from './client';
import { recentSubmissionsInTransaction } from './queries';
import { progressInTransaction } from './progress';
import { practiceInTransaction } from './practice';
import { preferencesInTransaction } from './preferences';
import { pathInTransaction } from './curriculum';

export function loadToday(userId: string) {
  // One page owns one slot. Its sections must not queue behind its own cold connections.
  return withUserDatabase(userId, async (database) => {
    const submissions = await recentSubmissionsInTransaction(database);
    const progress = await progressInTransaction(database);
    const preferences = await preferencesInTransaction(database, userId);
    const learningPath = await pathInTransaction(database);
    // Seed Practice last when its lock is free; otherwise read committed reviews.
    const practice = await practiceInTransaction(database, userId);
    return { submissions, progress, practice, preferences, learningPath };
  });
}
