import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

const eslint = new ESLint();
async function restrictedImports(source: string) {
  const [result] = await eslint.lintText(source, { filePath: 'src/lib/db/boundary-fixture.ts' });
  return result.messages.filter((message) => message.ruleId === 'no-restricted-imports');
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
