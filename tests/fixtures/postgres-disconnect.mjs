import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import postgres from 'postgres';

const driver = process.argv[2] === 'cjs' ? createRequire(import.meta.url)('postgres') : postgres;
const sockets = new Set();
const received = [];

function message(type, body = Buffer.alloc(0)) {
  const header = Buffer.alloc(5);
  header.write(type);
  header.writeInt32BE(body.length + 4, 1);
  return Buffer.concat([header, body]);
}

function ready(socket, command) {
  socket.write(
    Buffer.concat([
      message('C', Buffer.from(command + '\0')),
      message('Z', Buffer.from(command === 'BEGIN' ? 'T' : 'I')),
    ]),
  );
}

// A local PostgreSQL protocol peer makes socket loss deterministic without a database.
const server = createServer((socket) => {
  sockets.add(socket);
  socket.on('error', () => undefined);
  socket.on('close', () => sockets.delete(socket));
  let startup = true;
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (startup) {
      if (buffer.length < 4 || buffer.length < buffer.readInt32BE(0)) return;
      buffer = buffer.subarray(buffer.readInt32BE(0));
      startup = false;
      socket.write(
        Buffer.concat([
          message('R', Buffer.alloc(4)),
          message('K', Buffer.alloc(8)),
          message('Z', Buffer.from('I')),
        ]),
      );
    }
    while (buffer.length >= 5) {
      const length = buffer.readInt32BE(1) + 1;
      if (buffer.length < length) return;
      const type = String.fromCharCode(buffer[0]);
      const body = buffer.subarray(5, length);
      buffer = buffer.subarray(length);
      if (type === 'X') return socket.end();
      assert.equal(type, 'Q');
      const query = body.toString('utf8').replace(/\0$/, '').trim();
      received.push(query);
      if (query === 'select disconnect') return socket.end();
      ready(socket, query.toLowerCase().startsWith('begin') ? 'BEGIN' : 'SELECT 0');
    }
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const database = driver(`postgres://test:test@127.0.0.1:${address.port}/test`, {
  max: 1,
  max_pipeline: 1,
  prepare: false,
  fetch_types: false,
  connect_timeout: 1,
  backoff: 0,
});

try {
  let disconnected;
  let pendingResults;
  const failed = await database
    .begin((transaction) => {
      disconnected = transaction;
      const pending = [
        transaction.unsafe('select disconnect').execute(),
        transaction.unsafe('select queued_one').execute(),
        transaction.unsafe('select queued_two').execute(),
      ];
      pendingResults = Promise.allSettled(pending);
      return pending[0];
    })
    .catch((error) => error);
  assert.equal(failed.code, 'CONNECTION_CLOSED');
  const results = await pendingResults;
  assert(results.every((result) => result.status === 'rejected'));

  await database.unsafe('select healthy');
  const late = await disconnected.unsafe('insert late_callback').catch((error) => error);
  assert.equal(late.code, 'CONNECTION_CLOSED');
  assert(!received.includes('insert late_callback'));
  console.log(
    JSON.stringify({ queuedWorkRejected: true, poolRecovered: true, lateWorkRejected: true }),
  );
} finally {
  await database.end({ timeout: 0 });
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}
