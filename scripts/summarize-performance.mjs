import { readFile } from 'node:fs/promises';

const [path] = process.argv.slice(2);
if (!path) throw new Error('Usage: node scripts/summarize-performance.mjs server.log');
const lines = (await readFile(path, 'utf8')).split('\n');
const measurements = new Map();
const spans = [];
for (const line of lines) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    continue;
  }
  if (record.event === 'web_vital') measurements.set(record.id + ':' + record.name, record);
  if (record.event === 'server_timing') spans.push(record);
}
function percentile(values, fraction) {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
function group(records, key, value) {
  const groups = new Map();
  for (const record of records) {
    const name = key(record);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(value(record));
  }
  return [...groups].map(([name, values]) => ({
    name,
    samples: values.length,
    p50: percentile(values, 0.5),
    p75: percentile(values, 0.75),
    p95: percentile(values, 0.95),
    max: Math.max(...values),
  }));
}
console.log(
  JSON.stringify(
    {
      vitals: group(
        [...measurements.values()],
        (r) => `${r.route} ${r.device} ${r.name}`,
        (r) => r.value,
      ),
      server: group(
        spans,
        (r) => r.operation,
        (r) => r.durationMs,
      ),
    },
    null,
    2,
  ),
);
