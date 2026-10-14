import { expect, test } from '@playwright/test';

// These tests catch document jumps, inaccessible later corrections, and accidental
// edits to saved feedback. Preview data uses the real feedback components.
test('selecting a word keeps the writing in place and shows its correction', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/feedback');
  const mark = page.getByRole('button', { name: 'swimmed: swam', exact: true });
  await mark.focus();
  const initialScroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Enter');
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await expect(detail).toContainText('Swim has an irregular past form: swam.');
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  if (info.project.name === 'mobile') {
    await page.keyboard.press('Escape');
    await expect(mark).toBeFocused();
  } else {
    await expect(mark).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-connector]')).not.toHaveCount(0);
  }
});

test('eight corrections can be reviewed without scrolling down the document', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/feedback-many');
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  const initialScroll = await page.evaluate(() => window.scrollY);
  for (let index = 1; index < 8; index++) {
    await detail.getByRole('button', { name: 'Next correction', exact: true }).click();
  }
  await expect(detail).toContainText('Correction 8 of 8');
  await expect(detail).toContainText('next weekend');
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  if (info.project.name === 'desktop') {
    await expect(
      page.getByRole('link', { name: 'Revise your writing', exact: true }),
    ).toBeInViewport();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThan(1100);
  }
});

test('apply and undo change only the local revision and retain the original saved text', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Apply fix', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  await expect(detail).toContainText('Correction 2 of 3');
  await detail.getByRole('button', { name: 'Previous correction', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'Undo fix', exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Undo fix', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I go');
  await page.reload();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I go');
});

test('try it yourself gives feedback without silently replacing an incorrect answer', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Try it yourself', exact: true }).click();
  const answer = detail.getByRole('textbox', { name: 'Your correction' });
  await answer.fill('gone');
  await answer.press('Enter');
  await expect(detail.getByRole('status').filter({ hasText: 'Try again' })).toContainText(
    'Try again',
  );
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I go');
  await answer.fill('went');
  await answer.press('Enter');
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
});
