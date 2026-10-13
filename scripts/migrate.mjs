import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. No migration ran.');
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await database.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(20261013)`;
    await transaction.unsafe('CREATE SCHEMA IF NOT EXISTS drizzle');
    await transaction.unsafe(
      'CREATE TABLE IF NOT EXISTS drizzle.writing_migrations (name text PRIMARY KEY, hash text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const files = (await readdir('drizzle')).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    for (const name of files) {
      const migration = await readFile('drizzle/' + name, 'utf8');
      const hash = createHash('sha256').update(migration).digest('hex');
      const [applied] =
        await transaction`SELECT hash FROM drizzle.writing_migrations WHERE name = ${name}`;
      if (applied) {
        if (applied.hash !== hash) throw new Error('Applied migration was modified: ' + name);
        continue;
      }
      await transaction.unsafe(migration);
      await transaction`INSERT INTO drizzle.writing_migrations(name, hash) VALUES (${name}, ${hash})`;
      console.info('Applied ' + name);
    }
  });
} finally {
  await database.end();
}
