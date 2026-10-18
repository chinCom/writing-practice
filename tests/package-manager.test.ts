import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it.each(['npm/11.0.0 node/v24.0.0', 'yarn/1.22.0', ''])('rejects %j', (userAgent) => {
  const result = spawnSync(process.execPath, ['scripts/require-pnpm.mjs'], {
    env: { ...process.env, npm_config_user_agent: userAgent },
    encoding: 'utf8',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Use pnpm');
});

it('accepts pnpm', () => {
  const result = spawnSync(process.execPath, ['scripts/require-pnpm.mjs'], {
    env: { ...process.env, npm_config_user_agent: 'pnpm/12.14.0 npm/? node/v24.0.0' },
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
});
