import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('deduplicates authentication in a server render and isolates concurrent users', async () => {
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--conditions=react-server',
    '--import',
    'tsx',
    'tests/fixtures/auth-render-cache.ts',
  ]);
  expect(stdout).toContain(
    'Request deduplication, concurrent session isolation, and expired sessions verified.',
  );
});
