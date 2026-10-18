import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('dynamic Task 1 charts remain visible from the lesson through writing', async ({ page }) => {
  const units = JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8'));
  const lesson = units[0].lessons[0];
  await page.goto('/dev/preview/lesson?course=full&lesson=' + lesson.id);
  const chart = page.getByRole('figure', { name: 'Household internet access in Country X' });
  await expect(chart).toBeVisible();
  await expect(chart.locator('.MuiLineChart-line')).toHaveCount(3);
  await expect(chart.locator('.MuiChartsAxis-directionX')).toContainText('2010');
  await expect(chart.locator('.MuiChartsAxis-directionX')).toContainText('2020');
  await expect(chart.getByRole('table')).toContainText('74%');
  await expect(chart.getByRole('table')).toContainText('88%');
  await expect(chart.getByRole('table')).toContainText('9%');
  const model = page.getByText(/^The line graph compares/);
  await expect(model).toContainText('households in Country X');
  await expect(model).toContainText('2010 and 2020');
  await expect(model).toContainText('74%');
  await expect(model).not.toContainText('commuters');
  for (const [index, warmup] of lesson.warmups.entries()) {
    await page.getByRole('combobox', { name: 'Your answer' }).selectOption(warmup.answer);
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    if (index < lesson.warmups.length - 1)
      await page.getByRole('button', { name: 'Next warm-up' }).click();
  }
  await page.getByRole('link', { name: 'Start writing', exact: true }).click();
  await expect(page).toHaveURL(/curriculum-write/);
  await expect(chart).toBeVisible();
  await expect(chart.locator('.MuiLineChart-line')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await chart.screenshot({ path: test.info().outputPath('task-chart.png') });
});

for (const [lesson, title, selector, count] of [
  ['ielts-task1-dynamic-charts-2', 'Annual book sales in the UK', '.MuiBarChart-element', 9],
  ['ielts-task1-dynamic-charts-3', 'Retail sales channels in Country Y', '.MuiLineChart-line', 3],
] as const) {
  test(`${lesson} renders its own chart`, async ({ page, context }) => {
    const core = JSON.parse(await readFile('curriculum/course.draft.json', 'utf8'));
    const ielts = JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8'));
    const lessons = [...core, ...ielts].flatMap((unit) => unit.lessons);
    const written = lessons.flatMap((item, index) =>
      item.id.startsWith('ielts-task1-dynamic-charts-') && item.id < lesson ? [index] : [],
    );
    await context.addCookies([
      {
        name: 'course-preview',
        value: JSON.stringify({
          warmups: Object.fromEntries(
            written.flatMap((index) =>
              lessons[index].warmups.map((_: unknown, warmupIndex: number) => [
                `${index}:${warmupIndex}`,
                true,
              ]),
            ),
          ),
          written,
        }),
        url: 'http://127.0.0.1:3000',
      },
    ]);
    await page.goto('/dev/preview/lesson?course=full&lesson=' + lesson);
    const chart = page.getByRole('figure', { name: title });
    await expect(chart).toBeVisible();
    await expect(chart.locator(selector)).toHaveCount(count);
    const model = page.getByText(/^The (bar chart|line graph) illustrates/);
    if (lesson === 'ielts-task1-dynamic-charts-2') {
      await expect(model).toContainText('book sales');
      await expect(model).toContainText('2014 and 2024');
      await expect(model).toContainText('82 million');
      await expect(model).toContainText('38 million');
      await expect(model).toContainText('74 million');
      await expect(model).not.toContainText('electricity');
      await expect(page.getByText(/Convert 'rose sharply'/)).toContainText('audiobook sales');
    } else {
      await expect(model).toContainText('retail sales');
      await expect(model).toContainText('2005 and 2025');
      await expect(model).toContainText('49%');
      await expect(model).toContainText('13%');
      await expect(model).toContainText('38%');
      await expect(model).not.toContainText('household expenditure');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({ path: test.info().outputPath('chart-and-model.png'), fullPage: true });
  });
}
