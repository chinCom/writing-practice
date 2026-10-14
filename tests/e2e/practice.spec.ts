import { expect, test } from '@playwright/test';
const id = '00000000-0000-4000-8000-000000000055';
const question = {
  id,
  version: 0,
  text: 'We swimmed in the sea last weekend.',
  start: 3,
  end: 10,
  original: 'swimmed',
  tag: 'verb-form',
};

test('practice checks an answer, gives one retry, saves completion, and resumes the due queue', async ({
  page,
}) => {
  let version = 0;
  let complete = false;
  await page.route('**/dev/preview/practice', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          ok: true,
          questions: complete ? [] : [{ ...question, version }],
          nextReviewAt: complete ? '2030-01-02T00:00:00Z' : null,
        },
      });
      return;
    }
    const body = route.request().postDataJSON();
    expect(body).toEqual({ drillId: id, answer: version === 0 ? 'swimed' : 'swam', version });
    version++;
    complete = version === 2;
    await route.fulfill({
      json: {
        ok: true,
        result: {
          correct: complete,
          complete,
          version,
          box: 1,
          days: complete ? 1 : 0,
          misses: complete ? 0 : 1,
          explanation: 'Use swam for past events.',
          ...(complete ? { suggestion: 'swam' } : {}),
        },
      },
    });
  });
  await page.goto('/dev/preview/practice-page');
  const answer = page.getByRole('textbox', { name: 'Correct phrase' });
  await expect(page.getByText(question.text, { exact: false })).toBeVisible();
  await expect(
    page.getByText('Design preview · Sample content, not your progress', { exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Practice', exact: true }).first()).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(answer).toHaveAttribute('spellcheck', 'false');
  await answer.fill('swimed');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Try once more');
  await answer.fill('swam');
  await answer.press('Enter');
  await expect(page.getByRole('status')).toContainText('That’s right');
  await expect(page.getByText('Review again in 1 day', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No reviews due' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Write a message', exact: true })).toBeVisible();
});

test('practice keeps a lost answer request unchanged for a safe retry', async ({ page }) => {
  let posts = 0;
  await page.route('**/dev/preview/practice', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { ok: true, questions: [question], nextReviewAt: null } });
    expect(route.request().postDataJSON()).toEqual({ drillId: id, answer: 'swam', version: 0 });
    posts++;
    if (posts === 1) return route.abort('failed');
    return route.fulfill({
      json: {
        ok: true,
        result: {
          correct: true,
          complete: true,
          version: 1,
          box: 2,
          days: 3,
          misses: 0,
          explanation: 'Use swam in the past.',
          suggestion: 'swam',
        },
      },
    });
  });
  await page.goto('/dev/preview/practice-page');
  const answer = page.getByRole('textbox', { name: 'Correct phrase' });
  await answer.fill('swam');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your answer is still here' }),
  ).toBeVisible();
  await expect(answer).toBeDisabled();
  await page.getByRole('button', { name: 'Retry saving answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('That’s right');
  expect(posts).toBe(2);
});

test('public Practice asks for sign-in rather than showing fake progress', async ({ page }) => {
  await page.goto('/practice');
  await expect(page).toHaveURL(/\/login$/);
});
