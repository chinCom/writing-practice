import { expect, test } from '@playwright/test';

const originalId = '00000000-0000-4000-8000-000000000201';
const revisedId = '00000000-0000-4000-8000-000000000202';
const original = {
  id: originalId,
  createdAt: '2026-10-13T12:00:00Z',
  text: 'I go to the beach.',
  wordCount: 5,
  attempt: 1,
  parentSubmissionId: null,
  scores: { task: 2, organization: 3, grammar: 2, vocabulary: 3 },
};
const current = {
  ...original,
  id: revisedId,
  attempt: 2,
  parentSubmissionId: originalId,
  text: 'I went to the beach.',
  scores: { task: 4, organization: 3, grammar: 4, vocabulary: 2 },
};

test('portfolio reopens saved versions and compares changes without another AI call', async ({
  page,
}) => {
  let coachCalls = 0;
  await page.route('**/api/feedback', () => {
    coachCalls++;
  });
  await page.route('**/dev/preview/portfolio-data*', (route) =>
    route.fulfill({ json: { ok: true, data: { entries: [current, original], nextOffset: null } } }),
  );
  await page.route('**/dev/preview/revision-data*', (route) =>
    route.fulfill({ json: { ok: true, data: { current, original } } }),
  );
  await page.goto('/dev/preview/portfolio');
  await expect(page.getByRole('heading', { name: 'Your writing portfolio' })).toBeVisible();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open feedback' }).first()).toHaveAttribute(
    'href',
    '/feedback/' + revisedId,
  );
  await page.getByRole('link', { name: 'Compare with previous version' }).click();
  await expect(page.getByRole('heading', { name: 'Compare your versions' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Text changes' })).toContainText('went');
  await expect(page.getByRole('row', { name: 'Grammar 2/5 4/5 +2' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Vocabulary 3/5 2/5 -1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open previous feedback' })).toHaveAttribute(
    'href',
    '/feedback/' + originalId,
  );
  expect(coachCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('portfolio loads more saved writing and preserves earlier entries', async ({ page }) => {
  await page.route('**/dev/preview/portfolio-data*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data:
          new URL(route.request().url()).searchParams.get('offset') === '20'
            ? { entries: [original], nextOffset: null }
            : { entries: [current], nextOffset: 20 },
      },
    }),
  );
  await page.goto('/dev/preview/portfolio');
  await page.getByRole('button', { name: 'Load older writing' }).click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load older writing' })).toHaveCount(0);
});

test('a missing comparison provides a recovery link rather than exposing another account', async ({
  page,
}) => {
  await page.route('**/dev/preview/revision-data*', (route) =>
    route.fulfill({ status: 404, json: { ok: false, error: { code: 'NOT_FOUND' } } }),
  );
  await page.goto('/dev/preview/revision');
  await expect(
    page.getByRole('alert').filter({ hasText: 'This saved comparison is not available.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to portfolio' })).toBeVisible();
});

test('anonymous portfolio requires sign-in', async ({ page }) => {
  await page.goto('/portfolio');
  await expect(page).toHaveURL(/\/login$/);
});
