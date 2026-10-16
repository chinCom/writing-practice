import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it.each(['esm', 'cjs'])(
  'survives a lost %s transaction, rejects its queued and late work, and reconnects',
  (format) => {
    const result = spawnSync(
      process.execPath,
      [resolve('tests/fixtures/postgres-disconnect.mjs'), format],
      { encoding: 'utf8', timeout: 5000 },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      queuedWorkRejected: true,
      poolRecovered: true,
      lateWorkRejected: true,
    });
  },
);
