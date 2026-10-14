import { test, expect } from '@playwright/test';

test('Enter checks a warm-up through the preview endpoint and rejects an empty answer', async ({
  page,
}) => {
  await page.goto('/dev/preview/lesson');
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  const check = page.getByRole('button', { name: 'Check answer', exact: true });
  await expect(check).toBeDisabled();
  await answer.press('Enter');
  await expect(page.getByRole('status')).toHaveCount(0);
  await answer.fill('wrong');
  await answer.press('Enter');
  await expect(page.getByRole('status')).toContainText('Try again');
  await expect(answer).toHaveValue('wrong');
  await answer.fill('live');
  await answer.press('Enter');
  await expect(page.getByRole('button', { name: 'Next warm-up' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'could not save' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next warm-up' }).click();
  await page.getByRole('combobox', { name: 'Your answer' }).selectOption('She is a teacher.');
  await check.click();
  await expect(page.getByRole('link', { name: 'Start writing', exact: true })).toBeVisible();
});

test('Enter cannot duplicate a pending check and a failed check can be retried', async ({
  page,
}) => {
  let calls = 0;
  let finishCheck: (() => void) | undefined;
  const pendingCheck = new Promise<void>((resolve) => {
    finishCheck = resolve;
  });
  await page.route('**/dev/preview/lessons-api', async (route) => {
    calls++;
    if (calls === 1) {
      await pendingCheck;
      return route.fulfill({ status: 503, json: { ok: false } });
    }
    return route.fulfill({ json: { ok: true, correct: true, hint: null } });
  });
  await page.goto('/dev/preview/lesson');
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('live');
  await answer.press('Enter');
  await expect(answer).toBeDisabled();
  await page.keyboard.press('Enter');
  expect(calls).toBe(1);
  finishCheck?.();
  await expect(page.getByRole('alert').filter({ hasText: 'could not save' })).toBeVisible();
  await expect(answer).toHaveValue('live');
  await answer.press('Enter');
  await expect(page.getByRole('button', { name: 'Next warm-up' })).toBeVisible();
  expect(calls).toBe(2);
});

test('the preview endpoint checks only known warm-ups and rejects cross-origin writes', async ({
  request,
}) => {
  const endpoint = '/dev/preview/lessons-api';
  const valid = { lessonId: 'introducing-myself-1', index: 0, answer: 'live' };
  const invalid = await request.post(endpoint, { data: { ...valid, index: 99 } });
  expect(invalid.status()).toBe(400);
  const missing = await request.post(endpoint, { data: { ...valid, lessonId: 'missing' } });
  expect(missing.status()).toBe(404);
  const foreign = await request.post(endpoint, {
    data: valid,
    headers: { origin: 'https://example.com' },
  });
  expect(foreign.status()).toBe(403);
});
