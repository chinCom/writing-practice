import { expect, test } from '@playwright/test';

const message =
  'Hi Maria! Last weekend I went to the beach with my family. The weather was warm and we swam in the sea. I ate ice cream and my brother lost his hat. Would you like to come with us next weekend?';

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/dev/preview/feedback');
  await page
    .getByRole('link', { name: /^(Write|Writing Studio)$/ })
    .first()
    .click();
  await page.getByRole('checkbox', { name: 'Say where you went' }).check();
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  return writing;
}

test('browser Back warns and cancelling preserves the unsaved draft', async ({ page }) => {
  const writing = await openEditor(page);
  const warned = page.waitForEvent('dialog', { timeout: 4000 });
  await page.evaluate(() => history.back());
  const dialog = await warned;
  expect(dialog.type()).toBe('confirm');
  await dialog.dismiss();
  await expect(page).toHaveURL(/\/live-write$/);
  await expect(writing).toHaveValue(message);
});

test('recovering an older check does not silently discard newer writing', async ({ page }) => {
  let complete = false;
  await page.route('**/api/feedback', (route) =>
    route.fulfill({ status: 202, json: { ok: true, data: { status: 'pending' } } }),
  );
  await page.route('**/api/feedback?requestKey=*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: complete ? { status: 'completed', submissionId: 'older' } : { status: 'pending' },
      },
    }),
  );
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  const recover = page.getByRole('button', { name: 'Look for my feedback' });
  await expect(recover).toBeVisible({ timeout: 20000 });
  await writing.fill(message + ' New draft edits.');
  complete = true;
  page.once('dialog', (dialog) => dialog.dismiss());
  await recover.click();
  await expect(page).toHaveURL(/\/live-write$/);
  await expect(writing).toHaveValue(message + ' New draft edits.');
  await expect(recover).toBeEnabled();
});

test('stalled saving ends with an error and leaves writing editable', async ({ page }) => {
  await page.route('**/api/draft', () => {});
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Draft could not be saved' })).toBeVisible(
    { timeout: 13000 },
  );
  await expect(writing).toHaveValue(message);
  await expect(writing).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
});

test('oversized transferred revision remains visible for shortening', async ({ page }) => {
  await page.goto('/dev/preview/feedback');
  const revision = 'My corrected revision. '.repeat(60);
  await page.evaluate(
    (value) => sessionStorage.setItem('feedback-revision:preview', value),
    revision,
  );
  await page.goto('/dev/preview/live-write?revise=preview');
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toHaveValue(revision);
  await expect(page.getByRole('alert').filter({ hasText: 'Shorten' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check my writing' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toHaveValue(revision);
});

test('Practice reloads after a batch and reports completion only after the due queue is empty', async ({
  page,
}) => {
  let loads = 0;
  let completed = 0;
  await page.route('**/dev/preview/practice', (route) => {
    if (route.request().method() === 'GET') {
      loads++;
      return route.fulfill({
        json: {
          ok: true,
          questions:
            completed === 2
              ? []
              : [
                  {
                    id: String(completed),
                    version: 0,
                    text: 'I go yesterday.',
                    start: 2,
                    end: 4,
                    original: 'go',
                    tag: 'verb-tense',
                  },
                ],
          nextReviewAt: completed === 2 ? '2030-01-02T00:00:00Z' : '2000-01-01T00:00:00Z',
        },
      });
    }
    completed++;
    return route.fulfill({
      json: {
        ok: true,
        result: {
          correct: true,
          complete: true,
          version: 1,
          box: 1,
          days: 1,
          misses: 0,
          explanation: 'Use went.',
          suggestion: 'went',
        },
      },
    });
  });
  await page.goto('/dev/preview/practice-page');
  for (let batch = 0; batch < 2; batch++) {
    await page.getByRole('textbox', { name: 'Correct phrase' }).fill('went');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
    if (!batch) await expect(page.getByRole('textbox', { name: 'Correct phrase' })).toBeEnabled();
  }
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible();
  await expect(page.getByText(/Next review:/)).toContainText('2030');
  expect(loads).toBeGreaterThanOrEqual(3);
  expect(completed).toBe(2);
});
