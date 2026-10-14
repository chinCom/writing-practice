import { test, expect } from '@playwright/test';
test('a failed placement preserves both samples and a safety result cannot start a path', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/dev/preview/placement-api', (route) => {
    calls++;
    return route.fulfill(
      calls === 1
        ? { status: 502, json: { ok: false } }
        : {
            json: {
              ok: true,
              result: {
                cefr: 'A1',
                confidence: 0.4,
                reason: 'Please seek support.',
                safety_flag: true,
              },
            },
          },
    );
  });
  await page.goto('/dev/preview/placement');
  const about = page.getByRole('textbox', { name: 'About you' });
  const recent = page.getByRole('textbox', { name: 'A recent day' });
  const a = 'My name is Lin. I live in Hanoi and enjoy music.';
  const b = 'Yesterday I met a friend. We walked in a park and talked.';
  await about.fill(a);
  await recent.fill(b);
  for (const [index, value] of ['is', 'went', 'because'].entries())
    await page.getByRole('combobox').nth(index).selectOption(value);
  await page.getByRole('button', { name: 'Estimate my starting level' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your answers are still here' }),
  ).toBeVisible();
  await expect(about).toHaveValue(a);
  await expect(recent).toHaveValue(b);
  await page.getByRole('button', { name: 'Estimate my starting level' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'will not unlock' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start learning' })).toHaveCount(0);
});
test('a failed warm-up save keeps the answer and does not unlock writing', async ({ page }) => {
  await page.route('**/dev/preview/lessons-api', (route) =>
    route.fulfill({ status: 503, json: { ok: false } }),
  );
  await page.goto('/dev/preview/lesson');
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('live');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your answers are still here' }),
  ).toBeVisible();
  await expect(answer).toHaveValue('live');
  await expect(page.getByRole('link', { name: 'Start writing', exact: true })).toHaveCount(0);
});
