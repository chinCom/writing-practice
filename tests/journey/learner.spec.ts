import { test, expect } from '@playwright/test';
import { modelWords } from '../../src/lib/noticing';
import { createServerClient } from '@supabase/ssr';
import { journeyUnit, serviceURL, initialText, revisedText, accessToken } from './fixture';

test('a learner completes a lesson, revises, practises and returns to saved progress', async ({
  page,
  context,
  browser,
}, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  const cookies = new Map<string, string>();
  const auth = createServerClient(serviceURL, 'journey-public-key', {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => {
        for (const cookie of values) cookies.set(cookie.name, cookie.value);
      },
    },
  });
  const session = await auth.auth.setSession({
    access_token: accessToken,
    refresh_token: 'journey-refresh',
  });
  expect(session.error).toBeNull();
  await context.addCookies(
    [...cookies].map(([name, value]) => ({ name, value, domain: '127.0.0.1', path: '/' })),
  );
  const unit = await journeyUnit();
  const lesson = unit.lessons[0];
  await page.goto('/path');
  await page.getByRole('link', { name: lesson.title, exact: true }).click();
  await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
  await expect(page.getByText(lesson.miniLesson.modelText, { exact: true }).first()).toBeVisible();
  if (lesson.noticing) {
    const noticing = page.getByRole('region', { name: 'Read and notice', exact: true });
    const words = modelWords(lesson.miniLesson.modelText);
    for (const span of lesson.noticing.spans) {
      const index = words.findIndex((word) => word.start === span.start);
      await noticing.locator('button[aria-pressed]').nth(index).click();
    }
    await noticing.getByRole('button', { name: 'Check selections', exact: true }).click();
    await expect(noticing.getByRole('status')).toContainText(lesson.noticing.explanation);
  }
  for (const [index, warmup] of lesson.warmups.entries()) {
    await page
      .getByRole('combobox', { name: 'Your answer', exact: true })
      .selectOption(warmup.answer);
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    if (index < lesson.warmups.length - 1)
      await page.getByRole('button', { name: 'Next warm-up', exact: true }).click();
  }
  await page.reload();
  await page.getByRole('link', { name: 'Start writing', exact: true }).click();
  const writing = page.getByRole('textbox', { name: 'Your writing', exact: true });
  await writing.fill(initialText);
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/draft') && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await expect(writing).toHaveValue(initialText);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page).toHaveURL(/\/feedback\/[a-f0-9-]+$/);
  const originalURL = page.url();
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  await expect(
    page.getByText('Revise this part yourself. Check the rule for Verb tense.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Revise your writing', exact: true }).click();
  await expect(writing).toHaveValue(initialText);
  await writing.fill(revisedText);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page).toHaveURL(/\/feedback\/[a-f0-9-]+$/);
  expect(page.url()).not.toBe(originalURL);
  const revisionURL = page.url();
  await page.goto('/practice');
  const transferResponse = await page.request.get('/api/transfer');
  expect(transferResponse.ok()).toBe(true);
  const transfer = await transferResponse.json();
  expect(transfer.questions.length).toBeGreaterThan(0);
  const fresh = transfer.questions[0];
  const drill = unit.transferDrills!.find((item) => item.id === fresh.id)!;
  await expect(page.getByText(fresh.prompt, { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Complete the new sentence', exact: true })
    .fill(drill.answers[0]);
  const transferSaved = page.waitForResponse(
    (r) => r.url().endsWith('/api/transfer') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Check new sentence', exact: true }).click();
  expect((await transferSaved).ok()).toBe(true);
  await expect(
    page.getByRole('region', { name: 'Try a new sentence' }).getByRole('status'),
  ).toContainText('That’s right');
  const answer = page.getByRole('textbox', { name: 'Correct phrase', exact: true });
  await answer.fill('moving');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Try once more' })).toBeVisible();
  await answer.fill('moved');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByText('Review again in 1 day', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeVisible();
  // Reuse only login cookies: no localStorage, sessionStorage or client state.
  const returning = await browser.newContext({
    storageState: { cookies: (await context.storageState()).cookies, origins: [] },
  });
  const returned = await returning.newPage();
  returned.on('pageerror', (error) => failures.push(error.message));
  returned.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await returned.goto('/progress');
  const progressResponse = await returned.request.get('/api/progress');
  expect(progressResponse.ok()).toBe(true);
  const progress = await progressResponse.json();
  await testInfo.attach('saved-progress', {
    body: JSON.stringify(progress, null, 2),
    contentType: 'application/json',
  });
  expect(progress.data.sessions).toBe(2);
  expect(progress.data.reviews).toBe(1);
  expect(progress.data.correctReviews).toBe(1);
  expect(progress.data.course.core.lessonsDone).toBe(1);
  expect(progress.data.course.core.current.lessonId).toBe(unit.lessons[1].id);
  await expect(returned.getByText('Writing sessions', { exact: true })).toBeVisible();
  await expect(
    returned.getByRole('link', { name: 'Continue: ' + unit.lessons[1].title, exact: true }),
  ).toBeVisible();
  await returned.screenshot({ path: testInfo.outputPath('saved-progress.png'), fullPage: true });
  await returned.goto(revisionURL);
  // Streaming briefly keeps a hidden copy outside main until the loading fallback is replaced.
  await expect(returned.locator('#main').getByText(revisedText, { exact: true })).toBeVisible();
  await returned.goto('/path');
  await expect(
    returned.getByRole('link', { name: unit.lessons[1].title, exact: true }),
  ).toBeVisible();
  const transferAfter = await (await returned.request.get('/api/transfer')).json();
  expect(transferAfter.questions.some((item: { id: string }) => item.id === fresh.id)).toBe(false);
  await returned.goto('/practice');
  await expect(
    returned.getByRole('heading', { name: 'No reviews due', exact: true }),
  ).toBeVisible();
  const queue = await returned.request.get('/api/practice');
  const due = await queue.json();
  expect(due.questions).toEqual([]);
  expect(new Date(due.nextReviewAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3600000);
  expect((await (await returned.request.get(serviceURL + '/health')).json()).gradingCalls).toBe(2);
  await returning.close();
  expect(failures).toEqual([]);
});
