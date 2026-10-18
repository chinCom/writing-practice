import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export async function lintSource(source: string, directory = 'src/components') {
  const fixture = await mkdtemp(join(directory, '.lint-fixture-'));
  try {
    const file = join(fixture, directory === 'src/lib/db' ? 'fixture.ts' : 'fixture.tsx');
    await writeFile(file, source);
    const { stdout } = await execute(process.execPath, [
      resolve('node_modules/oxlint/bin/oxlint'),
      '--format=json',
      file,
    ]).catch((error) => {
      if (error.code !== 1 || !error.stdout) throw error;
      return error;
    });
    const result = JSON.parse(stdout) as {
      diagnostics: { code?: string; message: string }[];
    };
    return result.diagnostics;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}
