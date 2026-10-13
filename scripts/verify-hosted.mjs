// Opt-in hosted check. Creates no users. Use a disposable confirmed Auth account.
// Calls DeepSeek twice; each call uses paid provider tokens.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { chromium } from '@playwright/test';
import postgres from 'postgres';

process.loadEnvFile('.env');
const email = process.env.TEST_LOGIN_EMAIL;
const passwordFile = process.env.TEST_LOGIN_PASSWORD_FILE;
assert(email && passwordFile, 'Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD_FILE.');
assert(process.env.USE_MOCK_LLM !== 'true', 'Use live feedback for hosted verification.');
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const cookies = new Map();
const auth = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll: () => [...cookies.values()],
      setAll: (values) => {
        for (const value of values) cookies.set(value.name, value);
      },
    },
  },
);
const { data, error } = await auth.auth.signInWithPassword({
  email,
  password: (await readFile(passwordFile, 'utf8')).trim(),
});
assert(!error && data.user, 'Synthetic account authentication failed.');
const userId = data.user.id;
const browser = await chromium.launch();
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
let sample =
  'Hi Maria! Last weekend I go to the beach with my family. The weather was very good and we swimmed in the sea. I eat a big ice cream and my brother he lost his hat. In the evening we returned home tired but happy. I want to go again next weekend, if you can come with us?';
const artifactPath = 'docs/verification/hosted';
await mkdir(artifactPath, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies(
    [...cookies.values()].map(({ name, value }) => ({
      name,
      value,
      url: baseURL,
      sameSite: 'Lax',
    })),
  );
  const page = await context.newPage();
  await page.goto(baseURL + '/write/weekend');
  const editor = page.getByRole('textbox', { name: 'Your writing', exact: true });
  await editor.waitFor();
  // Wait for the streamed client editor to attach React handlers before changing its value.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('textarea')].some((input) =>
      Object.keys(input).some((key) => key.startsWith('__reactProps$')),
    ),
  );
  if ((await editor.inputValue()) === sample) sample += '\n';
  await editor.fill(sample);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByText('Draft saved to your account', { exact: true }).waitFor();
  await page.reload();
  await editor.waitFor();
  assert.equal(await editor.inputValue(), sample, 'Saved draft did not survive reload.');
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await page.waitForURL('**/feedback/*', { timeout: 90000 });
  await page.getByRole('heading', { name: 'Your marked page', exact: true }).waitFor();
  const originalURL = page.url();
  const originalId = originalURL.split('/').at(-1);
  assert.equal(await page.getByText('Mock feedback · No AI service was called.').count(), 0);
  await page.screenshot({ path: artifactPath + '/feedback-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: artifactPath + '/feedback-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseURL + '/today');
  await page.locator(`a[href="/feedback/${originalId}"]`).click();
  await page.waitForURL(originalURL);
  assert.equal(page.url(), originalURL, 'Saved feedback did not reopen from Today.');
  await page.getByRole('link', { name: 'Revise your writing', exact: true }).click();
  await editor.waitFor();
  await editor.fill(sample.replace('I go to', 'I went to').replace('we swimmed', 'we swam'));
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await page.waitForURL('**/feedback/*', { timeout: 90000 });
  await page.getByRole('heading', { name: 'Your marked page', exact: true }).waitFor();
  const revisionId = page.url().split('/').at(-1);
  assert.notEqual(revisionId, originalId);
  const rows = await database`
    SELECT s.id, s.attempt, s.parent_submission_id, s.status, f.model, u.mock
    FROM writing.submissions s
    JOIN writing.feedback f ON f.submission_id = s.id
    JOIN writing.ai_usage u ON u.submission_id = s.id
    WHERE s.user_id = ${userId}
    ORDER BY s.created_at
  `;
  const original = rows.find((row) => row.id === originalId);
  const revision = rows.find((row) => row.id === revisionId);
  assert.equal(original?.status, 'completed');
  assert.equal(revision?.attempt, 2);
  assert.equal(revision?.parent_submission_id, originalId);
  assert.equal(original?.mock, false);
  assert.equal(revision?.mock, false);
  await database.begin(async (transaction) => {
    await transaction`SELECT set_config('request.jwt.claim.sub', ${crypto.randomUUID()}, true)`;
    await transaction`SET LOCAL ROLE authenticated`;
    const privateRows = await transaction`
      SELECT id FROM writing.submissions WHERE user_id = ${userId}
    `;
    assert.equal(privateRows.length, 0, 'Another identity can read submitted writing.');
    const privateFeedback = await transaction`
      SELECT submission_id FROM writing.feedback WHERE user_id = ${userId}
    `;
    assert.equal(privateFeedback.length, 0, 'Another identity can read feedback.');
  });
  const anonymousContext = await browser.newContext();
  const anonymous = await anonymousContext.request.post(baseURL + '/api/feedback', {
    headers: { origin: baseURL },
    data: { taskId: 'weekend', text: sample, attempt: 1 },
  });
  assert.equal(anonymous.status(), 401);
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(originalURL);
  assert(anonymousPage.url().endsWith('/login'), 'Anonymous feedback access did not redirect.');
  console.log(
    JSON.stringify({
      authenticated: true,
      savedDraftReload: true,
      liveFeedback: true,
      feedbackReopened: true,
      revisionSaved: true,
      crossOwnerIsolation: true,
      anonymousDenied: true,
      model: original.model,
      artifacts: artifactPath,
      authenticationMethod: 'Confirmed disposable password account; magic-link delivery not tested',
    }),
  );
  await context.close();
  await anonymousContext.close();
} finally {
  await browser.close();
  await database.end();
  await auth.auth.signOut();
}
