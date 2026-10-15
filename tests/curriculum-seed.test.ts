import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('requires independent exact-hash approval of both tracks before connecting to the database', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'course-seed-'));
  try {
    await mkdir(join(folder, 'curriculum'));
    const sources = await Promise.all(
      ['course', 'ielts'].map(async (name) => {
        const source = await readFile('curriculum/' + name + '.draft.json');
        await writeFile(join(folder, 'curriculum/' + name + '.draft.json'), source);
        return source;
      }),
    );
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
    for (const [index, name] of ['review', 'ielts.review'].entries()) {
      await writeFile(
        join(folder, 'curriculum/' + name + '.json'),
        JSON.stringify({
          approved: true,
          reviewer: 'Synthetic test reviewer',
          reviewedAt: '2026-10-14T00:00:00Z',
          contentHash: createHash('sha256').update(sources[index]).digest('hex'),
        }),
      );
      if (index === 0) expect(run().stderr).toContain('Human review is required');
    }
    expect(run().stderr).toContain('DATABASE_URL is required');
    for (const [index, name] of ['course', 'ielts'].entries()) {
      const file = join(folder, 'curriculum/' + name + '.draft.json');
      await writeFile(file, Buffer.concat([sources[index], Buffer.from(' ')]));
      expect(run().stderr).toContain('exact content hash');
      await writeFile(file, sources[index]);
    }
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}, 15000);
