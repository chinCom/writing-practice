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
    const [submissions, progress, preferences, learningPath] = await Promise.all([
      recentSubmissionsInTransaction(database),
      progressInTransaction(database),
      preferencesInTransaction(database, userId),
      pathInTransaction(database),
    ]);
    // Seed Practice last when its lock is free; otherwise read committed reviews.
    const practice = await practiceInTransaction(database, userId);
    return { submissions, progress, practice, preferences, learningPath };
  });
}
