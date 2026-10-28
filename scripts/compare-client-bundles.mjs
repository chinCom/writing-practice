import { readFile } from 'node:fs/promises';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  throw new Error('Usage: node scripts/compare-client-bundles.mjs before.jsonl after.jsonl');
}

async function readGraph(path) {
  const source = await readFile(path, 'utf8');
  return source
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

function clientModuleBytes(graph, route, component) {
  const entry = graph.find(
    (record) =>
      record.type === 'group' &&
      record.route === route &&
      record.trigger_module_ident.endsWith(`/${component} [app-client] (ecmascript)`),
  );
  if (!entry) throw new Error(`Missing client entry: ${route} / ${component}`);
  const outputs = new Set(entry.outputs.filter((filename) => filename.endsWith('.js')));
  const parts = graph.filter(
    (record) => record.type === 'part' && record.route === route && outputs.has(record.filename),
  );
  return {
    bytes: parts.reduce((total, part) => total + part.size, 0),
    chartBytes: parts
      .filter((part) => part.source_path.includes('@mui/x-charts'))
      .reduce((total, part) => total + part.size, 0),
  };
}

const [before, after] = await Promise.all([readGraph(beforePath), readGraph(afterPath)]);
const comparisons = [
  ['/progress', 'Progress.tsx'],
  ['/write/[taskId]', 'LiveStudio.tsx'],
  ['/', 'Landing.tsx'],
  ['/today', 'Today.tsx'],
].map(([route, component]) => {
  const original = clientModuleBytes(before, route, component);
  const updated = clientModuleBytes(after, route, component);
  return {
    route,
    component,
    before: original,
    after: updated,
    reductionPercent: Number(((1 - updated.bytes / original.bytes) * 100).toFixed(1)),
  };
});

console.log(
  JSON.stringify(
    { metric: 'Eager minified client module bytes; uncompressed', comparisons },
    null,
    2,
  ),
);
