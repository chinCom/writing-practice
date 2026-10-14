import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('seeds the full course only after approval of the exact draft hash', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'course-seed-'));
  try {
    await mkdir(join(folder, 'curriculum'));
    const source = await readFile('curriculum/course.draft.json');
    await writeFile(join(folder, 'curriculum/course.draft.json'), source);
    const run = () =>
      spawnSync(
        process.execPath,
        [
          '--import',
          resolve('node_modules/tsx/dist/loader.mjs'),
          resolve('scripts/seed-curriculum.ts'),
        ],
        { cwd: folder, env: { ...process.env, DATABASE_URL: '' }, encoding: 'utf8' },
      );
    expect(run().stderr).toContain('Human review is required');
    const review = {
      approved: true,
      reviewer: 'Synthetic test reviewer',
      reviewedAt: '2026-10-14T00:00:00Z',
      contentHash: createHash('sha256').update(source).digest('hex'),
    };
    await writeFile(join(folder, 'curriculum/review.json'), JSON.stringify(review));
    expect(run().stderr).toContain('DATABASE_URL is required');
    await writeFile(
      join(folder, 'curriculum/course.draft.json'),
      Buffer.concat([source, Buffer.from(' ')]),
    );
    expect(run().stderr).toContain('exact content hash');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
