import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('removes public execution of the optional Supabase automatic RLS helper', async () => {
  const database = new PGlite();
  try {
    await database.exec(`
      CREATE ROLE authenticated;
      CREATE ROLE anon;
      CREATE FUNCTION public.rls_auto_enable() RETURNS void
        LANGUAGE sql SECURITY DEFINER AS 'SELECT';
    `);
    const permissions = () =>
      database.query<{ allowed: boolean }>(`
      SELECT has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
        OR has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute') AS allowed
    `);
    expect((await permissions()).rows[0].allowed).toBe(true);
    await database.exec(await readFile('drizzle/0001_secure_rls_helper.sql', 'utf8'));
    expect((await permissions()).rows[0].allowed).toBe(false);
    await database.exec('DROP FUNCTION public.rls_auto_enable()');
    await database.exec(await readFile('drizzle/0001_secure_rls_helper.sql', 'utf8'));
  } finally {
    await database.close();
  }
  // PGlite startup shares CPU with the full database suite; this is not a network deadline.
}, 15000);
