import { expect, test } from '@playwright/test';
test('retry hints emphasize the remaining mismatched phrase', async ({ page }) => {
  await page.route('**/dev/preview/practice', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'GET'
          ? {
              ok: true,
              questions: [
                {
                  id: '00000000-0000-4000-8000-000000000055',
                  version: 0,
                  text: 'I can finally get my head unwind.',
                  start: 14,
                  end: 32,
                  original: 'get my head unwind',
                  tag: 'word-choice',
                },
              ],
              nextReviewAt: null,
            }
          : {
              ok: true,
              result: {
                correct: false,
                complete: false,
                version: 1,
                box: 1,
                days: 0,
                misses: 1,
                explanation: 'Use let before a base verb like unwind.',
                hintTerms: ['let', 'unwind'],
                retryHint: { kind: 'phrase', phrase: 'to' },
              },
            },
    }),
  );
  await page.goto('/dev/preview/practice-page');
  await page.getByRole('textbox', { name: 'Correct phrase' }).fill('let my head to unwind');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  const result = page.getByRole('status').filter({ hasText: 'Try once more' });
  await expect(result).toContainText('to');
  await expect(result).not.toContainText('Use let before');
  await expect(result.locator('mark')).toHaveText(['to']);
  await expect(result.locator('mark').first()).toHaveCSS('font-weight', '700');
});
