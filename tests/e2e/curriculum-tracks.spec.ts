import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('switches URL tracks with history and opens independent IELTS modules', async ({ page }) => {
  await page.goto('/dev/preview/path?course=full');
  await page.getByRole('tab', { name: 'IELTS Writing Workspace', exact: true }).click();
  await expect(page).toHaveURL(/track=ielts/);
  for (const name of ['Academic Task 1', 'General Training Task 1', 'Writing Task 2'])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const units = JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8'));
  const first = units.find((unit: { id: string }) => unit.id === 'ielts-task2-opinion-essays')
    .lessons[0];
  await expect(page.getByRole('link', { name: first.title, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Core Writing Path/ }).click();
  await expect(page).toHaveURL(/track=core/);
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole('tab', { name: /Core Writing Path/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.goBack();
  await expect(
    page.getByRole('tab', { name: 'IELTS Writing Workspace', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('link', { name: first.title, exact: true }).click();
  await expect(
    page.getByText('Min 250 words · Recommended 40 mins', { exact: true }),
  ).toBeVisible();
  for (const [index, warmup] of first.warmups.entries()) {
    await page.getByRole('combobox', { name: 'Your answer' }).selectOption(warmup.answer);
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    if (index < first.warmups.length - 1)
      await page.getByRole('button', { name: 'Next warm-up' }).click();
  }
  await page.getByRole('link', { name: 'Start writing', exact: true }).click();
  await expect(
    page.getByText('Min 250 words · Recommended 40 mins', { exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Your writing' }).fill(first.miniLesson.modelText);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page).toHaveURL(/course-feedback/);
  for (const label of [
    'Task Response',
    'Coherence & Cohesion',
    'Lexical Resource',
    'Grammatical Range & Accuracy',
  ])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Task 1 uses its 150-word contract and Achievement rubric instead of Response', async ({
  page,
}) => {
  await page.goto('/dev/preview/lesson?course=full&lesson=ielts-task1-dynamic-charts-1');
  await expect(
    page.getByText('Min 150 words · Recommended 20 mins', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to learning path', exact: true }).click();
  await expect(page).toHaveURL(/track=ielts/);
  await page.goto('/dev/preview/course-feedback?task=ielts-task1-dynamic-charts-1-task');
  await expect(page.getByText('Task Achievement', { exact: true })).toBeVisible();
  await expect(page.getByText('Task Response', { exact: true })).toHaveCount(0);
});

test('Today exposes an IELTS entry without replacing the Core summary', async ({ page }) => {
  await page.goto('/dev/preview/today');
  await expect(
    page.getByRole('link', { name: 'IELTS Writing Workspace', exact: true }),
  ).toHaveAttribute('href', /track=ielts/);
  await expect(page.getByRole('link', { name: 'Open learning path', exact: true })).toBeVisible();
});
