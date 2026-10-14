import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

function connect() {
  if (!process.env.DATABASE_URL) throw new Error('NOT_CONFIGURED');
  const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 5,
    connection: {
      statement_timeout: 5000,
      lock_timeout: 2000,
      idle_in_transaction_session_timeout: 5000,
    },
  });
  return { client, database: drizzle(client) };
}
type Slot = { busy: boolean; connection?: ReturnType<typeof connect> };
const slots: Slot[] = Array.from({ length: 3 }, () => ({ busy: false }));
const waiters: Array<(slot: Slot) => void> = [];
function timeoutError() {
  return Object.assign(new Error('DATABASE_TIMEOUT'), { code: 'DATABASE_TIMEOUT' });
}
async function acquire(): Promise<Slot> {
  const available = slots.find((slot) => !slot.busy);
  if (available) {
    available.busy = true;
    return available;
  }
  // Bound both waiting time and the number of retained request callbacks.
  if (waiters.length >= 30) throw timeoutError();
  return new Promise((resolve, reject) => {
    const waiting = (slot: Slot) => {
      clearTimeout(timer);
      resolve(slot);
    };
    const timer = setTimeout(() => {
      const index = waiters.indexOf(waiting);
      if (index >= 0) waiters.splice(index, 1);
      reject(timeoutError());
    }, 2000);
    waiters.push(waiting);
  });
}
function release(slot: Slot) {
  const waiting = waiters.shift();
  if (waiting) waiting(slot);
  else slot.busy = false;
}
export async function withUserDatabase<T>(
  userId: string,
  work: (transaction: Transaction) => Promise<T>,
) {
  const slot = await acquire();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  try {
    slot.connection ??= connect();
    const { database, client } = slot.connection;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        // This client owns exactly one slot. Destroy it rather than leaving a query running.
        void client.end({ timeout: 0 }).finally(() => reject(timeoutError()));
      }, 10000);
    });
    const operation = database.transaction(async (transaction) => {
      await transaction.execute(sql`SET LOCAL statement_timeout = '5s'`);
      await transaction.execute(sql`SET LOCAL lock_timeout = '2s'`);
      await transaction.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '5s'`);
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    });
    try {
      return await Promise.race([operation, deadline]);
    } catch (error) {
      if (expired) {
        await client.end({ timeout: 0 });
        throw timeoutError();
      }
      throw error;
    }
  } finally {
    if (timer) clearTimeout(timer);
    if (expired) slot.connection = undefined;
    release(slot);
  }
}
export type Transaction = Parameters<
  Parameters<ReturnType<typeof connect>['database']['transaction']>[0]
>[0];
