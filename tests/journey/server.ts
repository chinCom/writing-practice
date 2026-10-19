// Test-only services. The application still uses its normal auth, SQL and grading clients.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { userId, serviceURL, initialText, revisedText, accessToken } from './fixture';

const database = await PGlite.create();
await database.exec(`
  CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  GRANT USAGE ON SCHEMA auth TO authenticated;
`);
for (const file of (await readdir('drizzle')).filter((name) => name.endsWith('.sql')).sort()) {
  await database.exec(await readFile('drizzle/' + file, 'utf8'));
}
await database.query('INSERT INTO auth.users VALUES ($1)', [userId]);
const units = JSON.parse(await readFile('curriculum/growth.draft.json', 'utf8'));
for (const unit of units)
  await database.query('INSERT INTO writing.curriculum_units VALUES ($1,$2,$3,$4,$5,now(),$6)', [
    unit.id,
    unit.level,
    unit.order,
    JSON.stringify(unit),
    'Synthetic journey fixture',
    'fixture-only',
  ]);
await database.query(
  `INSERT INTO writing.placement_results
  (user_id,status,result,chosen_level,calls_today,call_day,started_at,updated_at)
  VALUES ($1,'completed',$2,'A1',1,CURRENT_DATE,now(),now())`,
  [
    userId,
    JSON.stringify({
      cefr: 'A1',
      confidence: 1,
      reason: 'Synthetic fixture placement.',
      safety_flag: false,
    }),
  ],
);
const sqlServer = new PGLiteSocketServer({
  db: database,
  host: '127.0.0.1',
  port: 54329,
  maxConnections: 20,
});
await sqlServer.start();
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'journey@example.test',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
let gradingCalls = 0;
const services = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (
    request.url === '/auth/v1/user' &&
    request.headers.authorization === 'Bearer ' + accessToken
  ) {
    response.end(JSON.stringify(user));
    return;
  }
  if (request.url === '/v1/chat/completions' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    const text = input.messages.at(-1).content;
    if (!text.includes(initialText) && !text.includes(revisedText)) {
      response.writeHead(400);
      response.end(JSON.stringify({ error: 'Unexpected synthetic writing' }));
      return;
    }
    gradingCalls++;
    const revised = text.includes(revisedText);
    const feedback = {
      cefr_estimate: 'A1',
      scores: { task: 4, organization: 4, grammar: revised ? 4 : 3, vocabulary: 4 },
      strengths: ['Your introduction gives your name, work and learning goal.'],
      priorities: revised
        ? []
        : [{ tag: 'verb-tense', why: 'Use the past simple after last year.' }],
      corrections: revised
        ? []
        : [
            {
              original: 'move',
              suggestion: 'moved',
              tag: 'verb-tense',
              severity: 'minor',
              explanation: 'Use moved for an action that finished last year.',
              confidence: 1,
            },
          ],
      level_up_rewrite: revisedText,
      next_step: revised ? 'Try the rule in a new sentence.' : 'Revise the past-tense verb.',
      safety_flag: false,
      target_report: [
        { tag: 'connectors', uses: 3 },
        { tag: 'verb-tense', uses: 5 },
      ],
    };
    response.end(
      JSON.stringify({
        id: 'journey-' + gradingCalls,
        object: 'chat.completion',
        created: 1,
        model: 'journey-fixture',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(feedback) },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }),
    );
    return;
  }
  if (request.url === '/health') {
    response.end(JSON.stringify({ ok: true, gradingCalls }));
    return;
  }
  response.writeHead(401);
  response.end(JSON.stringify({ error: 'Synthetic service refused request' }));
});
await new Promise<void>((resolve) => services.listen(4319, '127.0.0.1', resolve));
const app = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    process.env.JOURNEY_APP_MODE === 'production' ? 'start' : 'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54329/postgres',
      NEXT_PUBLIC_SUPABASE_URL: serviceURL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'journey-public-key',
      SUPABASE_DB_PASSWORD: '',
      DEEPSEEK_API_KEY: 'journey-local-key',
      DEEPSEEK_BASE_URL: serviceURL + '/v1',
      DEEPSEEK_MODEL: 'journey-fixture',
      USE_MOCK_LLM: 'false',
      GOOGLE_AUTH_ENABLED: 'false',
      GROWTH_TARGETS: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  app.kill('SIGTERM');
  services.close();
  await sqlServer.stop();
  await database.close();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
app.on('exit', () => void stop());
