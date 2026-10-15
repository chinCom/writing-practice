import { expect, test } from '@playwright/test';

test('target answers stay hidden until an explicit Show me, including accessible names', async ({
  page,
}) => {
  await page.goto('/dev/preview/feedback-targets');
  await expect(page.getByRole('button', { name: 'One level higher', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /go: went/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  const details = page
    .getByRole('dialog')
    .or(page.getByRole('region', { name: 'Correction details', exact: true }));
  await expect(details.getByRole('button', { name: 'Apply fix', exact: true })).toHaveCount(0);
  await expect(details.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
  await expect(details.getByText('went', { exact: true })).toHaveCount(0);
  await expect(details).toContainText('Revise this part yourself. Check the rule for Verb tense.');
  await details.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(details.getByText('went', { exact: true })).toBeVisible();
  await expect(details.getByRole('button', { name: 'Apply fix', exact: true })).toBeVisible();
});

test('a submitted revision reveals target answers and the rewrite', async ({ page }) => {
  await page.goto('/dev/preview/feedback-targets-revision');
  await expect(page.getByRole('button', { name: 'One level higher', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply fix', exact: true })).toBeVisible();
});

test('non-target and legacy corrections keep Apply', async ({ page }) => {
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply fix', exact: true })).toBeVisible();
});
