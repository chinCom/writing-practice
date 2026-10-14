import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { CurriculumUnit } from '../../src/lib/curriculum';
const curriculumDraft: CurriculumUnit[] = JSON.parse(
  readFileSync('curriculum/a1-b1.draft.json', 'utf8'),
);
const units = curriculumDraft.map((unit, unitIndex) => ({
  ...unit,
  lessons: unit.lessons.map((lesson, index) => ({
    ...lesson,
    state: unitIndex === 0 && index === 0 ? 'current' : 'locked',
    warmupsDone: false,
    answers: {},
  })),
}));
test('placement estimates a level, allows another starting level, and opens the path', async ({
  page,
}) => {
  let chosen: string | null = null;
  await page.route('**/dev/preview/placement-api', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      chosen = route.request().postDataJSON().level;
      return route.fulfill({ json: { ok: true, chosenLevel: chosen } });
    }
    return route.fulfill({
      json: {
        ok: true,
        result:
          method === 'POST'
            ? {
                cefr: 'A1',
                confidence: 0.75,
                reason: 'You write clear simple sentences.',
                safety_flag: false,
              }
            : null,
        chosenLevel: chosen,
      },
    });
  });
  await page.goto('/dev/preview/placement');
  await page
    .getByRole('textbox', { name: 'About you' })
    .fill('My name is Lin. I live in Hanoi and I like books.');
  await page
    .getByRole('textbox', { name: 'A recent day' })
    .fill('Yesterday I went to the park. I met my friend and we talked.');
  const selects = page.getByRole('combobox');
  for (const [i, value] of ['is', 'went', 'because'].entries())
    await selects.nth(i).selectOption(value);
  await page.getByRole('button', { name: 'Estimate my starting level' }).click();
  await expect(page.getByText('You write clear simple sentences.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Starting level' }).selectOption('A2');
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page).toHaveURL(/\/dev\/preview\/path$/);
  expect(chosen).toBe('A2');
});
test('learning path shows locked lessons and a lesson grades warm-ups before writing', async ({
  page,
}) => {
  await page.route('**/dev/preview/lessons-api', async (route) => {
    const body = route.request().postDataJSON();
    const warmup = units[0].lessons[0].warmups[body.index];
    const correct = body.answer === warmup.answer;
    await route.fulfill({
      json: {
        ok: true,
        correct,
        hint: correct ? null : warmup.hint,
        warmupsDone: correct && body.index === 1,
        answers: correct ? { [body.index]: true } : {},
      },
    });
  });
  await page.goto('/dev/preview/path');
  await expect(page.getByRole('button', { name: /Locked/ }).first()).toBeDisabled();
  await page.getByRole('link', { name: 'Tell someone about yourself', exact: true }).click();
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('wrong');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Try again');
  await answer.fill('live');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.getByRole('button', { name: 'Next warm-up' }).click();
  await page.getByRole('combobox', { name: 'Your answer' }).selectOption('She is a teacher.');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Start writing', exact: true })).toBeVisible();
});
