import { expect, test } from '@playwright/test';

const message =
  'Hi Maria! Last weekend I went to the beach with my family. The weather was warm and we swam in the sea. I ate ice cream and my brother lost his hat. Would you like to come with us next weekend?';
const recoveryStorageKey = 'coach-check:/dev/preview/live-write';

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  return writing;
}

test('a terminal failure clears the saved key and retry starts a distinct check', async ({
  page,
}) => {
  const keys: string[] = [];
  await page.route('**/api/feedback', (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    return route.fulfill({
      status: 502,
      json: { ok: false, error: { code: 'COACH_TIMEOUT' } },
    });
  });
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  const retry = page.getByRole('button', { name: 'Try again', exact: true });
  await expect(retry).toBeEnabled();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), recoveryStorageKey)).toBeNull();
  await retry.click();
  await expect(retry).toBeEnabled();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[a-f0-9-]{36}$/i);
  expect(keys[1]).toMatch(/^[a-f0-9-]{36}$/i);
  expect(keys[1]).not.toBe(keys[0]);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), recoveryStorageKey)).toBeNull();
  await expect(writing).toHaveValue(message);
});

test('blocked recovery storage still allows in-memory lost-response recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('coach-check:'))
        throw new DOMException('Storage blocked', 'SecurityError');
      return setItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key) {
      if (key.startsWith('coach-check:'))
        throw new DOMException('Storage blocked', 'SecurityError');
      return removeItem.call(this, key);
    };
  });
  const postedKeys: string[] = [];
  const recoveredKeys: string[] = [];
  await page.route('**/api/feedback', async (route) => {
    postedKeys.push(route.request().headers()['idempotency-key']);
    await route.abort('failed');
  });
  await page.route('**/api/feedback?requestKey=*', (route) => {
    recoveredKeys.push(new URL(route.request().url()).searchParams.get('requestKey')!);
    return route.fulfill({
      json: { ok: true, data: { status: 'completed', submissionId: 'saved' } },
    });
  });
  await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(postedKeys).toHaveLength(1);
  expect(recoveredKeys).toEqual(postedKeys);
});

test('successful reload recovery clears its key without another writing request', async ({
  page,
}) => {
  const savedKey = '00000000-0000-4000-8000-000000000015';
  let posts = 0;
  const lookups: string[] = [];
  await page.route('**/api/feedback', (route) => {
    posts++;
    return route.fulfill({ status: 500, json: { ok: false } });
  });
  await page.route('**/api/feedback?requestKey=*', (route) => {
    lookups.push(new URL(route.request().url()).searchParams.get('requestKey')!);
    return route.fulfill({
      json: { ok: true, data: { status: 'completed', submissionId: 'saved' } },
    });
  });
  await page.goto('/dev/preview/live-write');
  await page.getByRole('checkbox', { name: 'Say where you went' }).check();
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: recoveryStorageKey,
    value: savedKey,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(posts).toBe(0);
  expect(lookups).toEqual([savedKey]);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), recoveryStorageKey)).toBeNull();
});

test('an invalid saved recovery key does not block a new writing check', async ({ page }) => {
  await page.addInitScript((key) => sessionStorage.setItem(key, 'invalid-key'), recoveryStorageKey);
  let lookups = 0;
  let postedKey: string | undefined;
  await page.route('**/api/feedback?requestKey=*', (route) => {
    lookups++;
    return route.fulfill({ status: 404, json: { ok: false } });
  });
  await page.route('**/api/feedback', (route) => {
    postedKey = route.request().headers()['idempotency-key'];
    return route.fulfill({
      json: { ok: true, data: { status: 'completed', submissionId: 'new-check' } },
    });
  });
  await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(lookups).toBe(0);
  expect(postedKey).toMatch(/^[a-f0-9-]{36}$/i);
});
