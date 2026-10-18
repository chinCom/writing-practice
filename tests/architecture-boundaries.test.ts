import { lintSource } from './helpers/lint-source';
import { expect, it } from 'vitest';

async function restrictedImports(source: string) {
  const messages = await lintSource(source, 'src/lib/db');
  return messages.filter((message) => message.code?.endsWith('(no-restricted-imports)'));
}
it.each(['@/lib/api', '../api', '@/lib/llm/grade', '../llm/explain', 'next/server'])(
  'prevents database operations importing adapter %s',
  async (path) => {
    expect(await restrictedImports(`import { Adapter } from '${path}';`)).toHaveLength(1);
  },
);
it('allows domain/result contracts and database infrastructure', async () => {
  expect(
    await restrictedImports(`
    import { DomainError } from '@/lib/domain-error';
    import type { AiResult } from '@/lib/ai-result';
    import { withUserDatabase } from './client';
  `),
  ).toEqual([]);
});
it('retains the existing UI dependency restrictions in database files', async () => {
  expect(await restrictedImports("import { Widget } from '@radix-ui/widget';")).toHaveLength(1);
});
