import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

function connect() {
  if (!process.env.DATABASE_URL) throw new Error('NOT_CONFIGURED');
  return drizzle(postgres(process.env.DATABASE_URL, { prepare: false, max: 3, idle_timeout: 20 }));
}
let database: ReturnType<typeof connect> | undefined;
export async function withUserDatabase<T>(
  userId: string,
  work: (transaction: Transaction) => Promise<T>,
) {
  database ??= connect();
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
    await transaction.execute(sql`SET LOCAL ROLE authenticated`);
    return work(transaction);
  });
}
export type Transaction = Parameters<Parameters<ReturnType<typeof connect>['transaction']>[0]>[0];
