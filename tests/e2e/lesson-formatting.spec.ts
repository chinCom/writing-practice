import { test, expect } from '@playwright/test';

test('short lessons render Markdown as readable headings, emphasis, examples, and lists', async ({
  page,
}) => {
  await page.goto('/dev/preview/lesson?course=full&lesson=first-words-1');
  const lesson = page.getByRole('heading', { name: 'A short lesson', exact: true }).locator('..');
  await expect(
    lesson.getByRole('heading', { name: 'Building Your First Clause', level: 3 }),
  ).toBeVisible();
  await expect(lesson.locator('strong').filter({ hasText: /^Subject$/ })).toBeVisible();
  await expect(lesson.locator('em').filter({ hasText: /^I$/ })).toBeVisible();
  await expect(lesson.locator('code').filter({ hasText: 'I am + [Name].' })).toBeVisible();
  await expect(lesson.getByRole('listitem')).toHaveCount(2);
  await expect(lesson).not.toContainText('###');
  await expect(lesson).not.toContainText('**');
  await lesson.screenshot({ path: test.info().outputPath('lesson-formatting.png') });

  await page.goto('/dev/preview/lesson?course=full&lesson=ielts-task1-general-letters-1');
  const numberedList = page
    .getByRole('list')
    .filter({ has: page.locator('li strong', { hasText: 'Semi-Formal' }) });
  await expect(numberedList).toHaveJSProperty('tagName', 'OL');
  await expect(numberedList.getByRole('listitem')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
