import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { curriculumSchema } from '../../src/lib/curriculum';

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

test('advanced writing renders only the supplied word bank', async ({ page, context }) => {
  const units = curriculumSchema.parse(
    JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
  );
  const lessons = units.flatMap((unit) => unit.lessons);
  const index = lessons.findIndex(
    (lesson: { task: { targetLevel: string } }) => lesson.task.targetLevel === 'C1',
  );
  await context.addCookies([
    {
      name: 'course-preview',
      value: JSON.stringify({
        written: Array.from({ length: index }, (_, i) => i),
        warmups: Object.fromEntries(
          lessons
            .slice(0, index + 1)
            .flatMap((lesson, i) => lesson.warmups.map((_, j) => [i + ':' + j, true])),
        ),
      }),
      domain: '127.0.0.1',
      path: '/dev/preview',
    },
  ]);
  await page.goto('/dev/preview/curriculum-write?course=full&task=' + lessons[index].task.id);
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toBeVisible();
  await expect(page.getByText('Useful phrases (word bank)', { exact: true })).toHaveCount(
    lessons[index].task.wordBank.length ? 1 : 0,
  );
  for (const phrase of lessons[index].task.wordBank)
    await expect(page.getByRole('button', { name: phrase, exact: true })).toBeVisible();
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
  const units = JSON.parse(await readFile('curriculum/course.draft.json', 'utf8'));
  for (const [index, warmup] of units[0].lessons[0].warmups.entries()) {
    await page.getByRole('combobox', { name: 'Your answer' }).selectOption(warmup.answer);
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    if (index < units[0].lessons[0].warmups.length - 1)
      await page.getByRole('button', { name: 'Next warm-up' }).click();
  }
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
