import { expect, test } from '@playwright/test';

const question = {
  id: '00000000-0000-4000-8000-000000000055',
  version: 3,
  text: 'We swimmed yesterday.',
  start: 3,
  end: 10,
  original: 'swimmed',
  tag: 'verb-form',
};
const completed = {
  correct: true,
  complete: true,
  version: 4,
  box: 2,
  days: 3,
  misses: 0,
  explanation: 'Use swam for a past event.',
  suggestion: 'swam',
};

test('a delayed answer freezes editing and ignores duplicate form submissions', async ({
  page,
}) => {
  let release: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  await page.route('**/dev/preview/practice', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { ok: true, questions: [question], nextReviewAt: null } });
    posts++;
    expect(route.request().postDataJSON()).toEqual({
      drillId: question.id,
      answer: 'swam',
      version: 3,
    });
    await waiting;
    return route.fulfill({ json: { ok: true, result: completed } });
  });
  await page.goto('/dev/preview/practice-page');
  const answer = page.getByRole('textbox', { name: 'Correct phrase' });
  await answer.fill('  swam  ');
  await answer.press('Enter');
  await expect(answer).toBeDisabled();
  await answer.evaluate((input) =>
    input.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
  release();
  await expect(page.getByRole('status')).toContainText('That’s right');
  expect(posts).toBe(1);
});

test('a stale answer preserves its text and reloads the server queue only on request', async ({
  page,
}) => {
  let loads = 0;
  let posts = 0;
  let version = 3;
  await page.route('**/dev/preview/practice', (route) => {
    if (route.request().method() === 'GET') {
      loads++;
      return route.fulfill({
        json: {
          ok: true,
          questions: [{ ...question, version }],
          nextReviewAt: null,
        },
      });
    }
    posts++;
    return route.fulfill({
      status: 409,
      json: { ok: false, error: { code: 'PRACTICE_CONFLICT' } },
    });
  });
  await page.goto('/dev/preview/practice-page');
  const answer = page.getByRole('textbox', { name: 'Correct phrase' });
  await answer.fill('swam');
  // Strict Mode may perform two initial reads; only user-requested reloads matter here.
  const initialLoads = loads;
  await answer.press('Enter');
  const conflict = page
    .getByRole('alert')
    .filter({ hasText: 'This question changed in another tab' });
  await expect(conflict).toBeVisible();
  await expect(answer).toHaveValue('swam');
  await expect(answer).toBeDisabled();
  expect(loads).toBe(initialLoads);
  expect(posts).toBe(1);
  version = 4;
  await conflict.getByRole('button', { name: 'Reload practice', exact: true }).click();
  await expect(answer).toBeEnabled();
  await expect(answer).toHaveValue('');
  expect(loads).toBe(initialLoads + 1);
  expect(posts).toBe(1);
});
