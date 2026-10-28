import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';

// Read-only connectivity and aggregated statement timings. No learner rows or SQL text are exported.
const database = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 5,
  connection: { statement_timeout: 5000, application_name: 'writing-performance-readonly' },
});
const timings = [];
const output = { source: 'Hosted database, read-only diagnostics from this workstation', timings };
try {
  for (let run = 0; run < 5; run++) {
    const start = performance.now();
    await database`select 1`;
    timings.push({
      run,
      kind: run === 0 ? 'connect-and-query' : 'warm-query',
      durationMs: performance.now() - start,
    });
  }
  const [extension] = await database`select n.nspname as schema from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_stat_statements'`;
  if (extension) {
    output.statements = await database`select queryid::text as query_id, calls,
      mean_exec_time as mean_ms, max_exec_time as max_ms, rows,
      query ilike '%pg_sleep%' as artificial_delay
      from ${database(extension.schema)}.pg_stat_statements
      where dbid = (select oid from pg_database where datname = current_database()) and calls >= 3
      order by mean_exec_time desc limit 10`;
  }
} catch (error) {
  output.errorCode = typeof error.code === 'string' ? error.code : 'DIAGNOSTIC_FAILED';
} finally {
  await database.end({ timeout: 1 });
}
await writeFile(
  process.argv[2] ?? '/tmp/writing-database-timings.json',
  JSON.stringify(output, null, 2) + '\n',
);
console.log('Database timing report written; no credentials or learner content included.');
