import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('an empty warm-up selector keeps its label above the selected text', async ({ page }) => {
  await page.goto('/dev/preview/lesson?course=full&lesson=first-words-1');
  const selector = page.getByRole('combobox', { name: 'Your answer' });
  await expect(selector).toBeVisible();
  const label = page.locator('label', { hasText: 'Your answer' });
  await expect
    .poll(async () => {
      const labelBounds = await label.boundingBox();
      const selectorBounds = await selector.boundingBox();
      return labelBounds && selectorBounds
        ? labelBounds.y + labelBounds.height - selectorBounds.y
        : 100;
    })
    .toBeLessThan(8);
});

test('advanced independent writing has no empty word bank', async ({ page, context }) => {
  const units = JSON.parse(await readFile('curriculum/course.draft.json', 'utf8'));
  const lessons = units.flatMap(
    (unit: { lessons: { task: { id: string; targetLevel: string } }[] }) => unit.lessons,
  );
  const index = lessons.findIndex(
    (lesson: { task: { targetLevel: string } }) => lesson.task.targetLevel === 'C1',
  );
  await context.addCookies([
    {
      name: 'course-preview',
      value: JSON.stringify({
        written: Array.from({ length: index }, (_, i) => i),
        warmups: Object.fromEntries(
          Array.from({ length: index + 1 }, (_, i) => [
            [i + ':0', true],
            [i + ':1', true],
          ]).flat(),
        ),
      }),
      domain: '127.0.0.1',
      path: '/dev/preview',
    },
  ]);
  await page.goto('/dev/preview/curriculum-write?course=full&task=' + lessons[index].task.id);
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toBeVisible();
  await expect(page.getByText('Useful phrases (word bank)', { exact: true })).toHaveCount(0);
});
test('opens every course level without exposing answer keys and completes a lesson through writing', async ({
  page,
}) => {
  await page.goto('/dev/preview/path?course=full');
  for (const level of ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    await expect(page.getByText(level, { exact: true }).first()).toBeVisible();
  const lesson = page.getByRole('link', { name: 'Names and roles', exact: true });
  await expect(lesson).toHaveAttribute('href', /lesson=.*first-words-1/);
  await lesson.click();
  await expect(page.getByRole('heading', { name: 'Names and roles', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Your answer' }).selectOption('I am Lin.');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.getByRole('button', { name: 'Next warm-up' }).click();
  await page.getByRole('combobox', { name: 'Your answer' }).selectOption('I am a student.');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.getByRole('link', { name: 'Start writing', exact: true }).click();
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('I am Kim. I am a student.');
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page).toHaveURL(/course-feedback/);
  const revise = page.getByRole('link', { name: 'Revise your writing', exact: true });
  await expect(revise).toHaveAttribute('href', /curriculum-write\?course=full&task=first-words/);
  await revise.click();
  await expect(writing).toHaveValue('I am Kim. I am a student.');
  await page.goto('/dev/preview/path?course=full');
  await expect(page.getByRole('link', { name: 'Things I like', exact: true })).toBeVisible();
  const payload = await page.request.get('/dev/preview/course-api');
  expect(JSON.stringify(await payload.json())).not.toContain('"answer":');
});
