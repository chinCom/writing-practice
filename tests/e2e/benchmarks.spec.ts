import { expect, test } from '@playwright/test';

test('Progress uses matched benchmarks, with descriptive values until calibration is verified', async ({
  page,
}) => {
  await page.goto('/dev/preview/progress');
  const panel = page.getByRole('region', { name: 'Unit benchmarks' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Unit start: 2 / 5');
  await expect(panel).toContainText('Checkpoint: 4 / 5');
  await expect(panel).toContainText('20% → 0%');
  await expect(panel).toContainText('No verified noise calibration');
  await expect(panel).toContainText('Mean sentence length');
  await expect(panel).toContainText('Lexical diversity (MTLD)');
  await expect(
    page.getByRole('table', { name: 'Your first 3 checks compared with your latest 3' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Progress never manufactures a benchmark for legacy or unmatched checks', async ({ page }) => {
  await page.goto('/dev/preview/progress-empty');
  const panel = page.getByRole('region', { name: 'Unit benchmarks' });
  await expect(panel).toContainText('Finish a reviewed unit');
  await expect(panel).not.toContainText('Unit start:');
  await expect(panel).not.toContainText('NaN');
});
