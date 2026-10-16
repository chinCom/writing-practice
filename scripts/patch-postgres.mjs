import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// postgres 3.4.9 can write ROLLBACK to a null socket after a transaction disconnects.
// Backport https://github.com/porsager/postgres/pull/1215 and the defensive guard
// from https://github.com/porsager/postgres/pull/1209 until a fixed release exists.
const packageRoot = dirname(dirname(fileURLToPath(import.meta.resolve('postgres'))));
const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
if (metadata.version !== '3.4.9') {
  throw new Error(
    'Review the postgres disconnect patch before changing the pinned driver version.',
  );
}

const changes = {
  'connection.js': [
    [
      '  function nextWrite(fn) {\n    const x = socket.write(chunk, fn)',
      `  function nextWrite(fn) {
    if (!socket || socket.destroyed) {
      clearImmediate(nextWriteTimer)
      chunk = nextWriteTimer = null
      error(Errors.connection('CONNECTION_CLOSED', options, socket))
      return false
    }
    const x = socket.write(chunk, fn)`,
    ],
    [
      "    clearImmediate(nextWriteTimer)\n    socket.removeListener('data', data)",
      "    clearImmediate(nextWriteTimer)\n    chunk = nextWriteTimer = null\n    socket.removeListener('data', data)",
    ],
    [
      '    closedTime = performance.now()',
      `    query = results = errorResponse = null
    result = new Result()
    rows = 0
    closedTime = performance.now()`,
    ],
  ],
  'index.js': [
    [
      '    let savepoints = 0\n      , connection\n      , prepare = null',
      '    let savepoints = 0\n      , connection\n      , closedError\n      , prepare = null',
    ],
    [
      '        new Promise((_, reject) => connection.onclose = reject)',
      `        new Promise((_, reject) => connection.onclose = error => {
          closedError = error
          while (queries.length)
            queries.shift().reject(error)
          reject(error)
        })`,
    ],
    [
      '        q.catch(e => uncaughtError || (uncaughtError = e))',
      `        q.catch(e => uncaughtError || (uncaughtError = e))
        if (closedError)
          return q.reject(closedError)`,
    ],
  ],
};

function patchSource(source, before, after, path) {
  if (source.includes(after)) return source;
  if (source.split(before).length !== 2) {
    throw new Error('Unexpected postgres source; cannot safely apply disconnect patch: ' + path);
  }
  return source.replace(before, after);
}

// Patch both module formats: Next.js and standalone Node scripts can choose different exports.
const updates = [];
for (const directory of ['src', 'cjs/src']) {
  for (const [name, replacements] of Object.entries(changes)) {
    const path = join(packageRoot, directory, name);
    const source = await readFile(path, 'utf8');
    const patched = replacements.reduce(
      (current, [before, after]) => patchSource(current, before, after, path),
      source,
    );
    if (patched !== source) updates.push({ path, patched });
  }
}
for (const { path, patched } of updates) await writeFile(path, patched);
if (updates.length) console.info('Applied postgres 3.4.9 transaction disconnect fix.');
