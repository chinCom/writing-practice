import { expect, test } from '@playwright/test';

const caption =
  'Practice estimate from your first attempts, not revisions. It is not an official IELTS band or CEFR certificate.';

function goalCard(page: import('@playwright/test').Page) {
  return page.getByRole('region', { name: 'Your goal' });
}

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('a level goal shows a labelled range, the skill holding the learner back, and the week', async ({
  page,
}) => {
  await page.goto('/dev/preview/today?goal=working');
  const card = goalCard(page);
  await expect(card.getByText('Write at B1 by Mar 15, 2027')).toBeVisible();
  await expect(card.getByText('Working towards it')).toBeVisible();
  await expect(card).toContainText('At A2, your recent first attempts score 3.1 out of 5');
  await expect(card).toContainText('(from 2.8 to 3.5). 3 meets the level.');
  // The weakest skill is named in text, not only by its bar colour.
  await expect(card.getByText('Grammar · Holding you back')).toBeVisible();
  await expect(card.getByRole('progressbar', { name: 'Grammar: 2.3 out of 5' })).toBeVisible();
  await expect(card).toContainText('B1 is 1 level up, with 18 lessons to go.');
  await expect(card).toContainText('2 of 5 checked pieces. Focus on Grammar.');
  await expect(card).toContainText('On pace: about 1 a week until Mar 15, 2027.');
  await expect(card.getByText(caption)).toBeVisible();
  await expect(card.getByRole('link', { name: 'Change goal' })).toHaveAttribute(
    'href',
    '/dev/preview/onboarding',
  );
  await noHorizontalScroll(page);
});

test('an IELTS goal measures the practice score, flags a pace that is too slow, and links an IELTS task', async ({
  page,
}) => {
  await page.goto('/dev/preview/today?goal=ielts');
  const card = goalCard(page);
  await expect(card.getByText('IELTS practice score 4 by Nov 1, 2026')).toBeVisible();
  await expect(card).toContainText('Your recent IELTS first attempts score 3.4 out of 5');
  await expect(card).toContainText(
    'aim for about 8 a week. That is more than your weekly goal of 5.',
  );
  await expect(card.getByRole('link', { name: /^Next: / })).toHaveAttribute(
    'href',
    /^\/lesson\/ielts-/,
  );
  // An IELTS learner is not shown the separate IELTS promo card.
  await expect(page.getByRole('heading', { name: 'IELTS writing practice' })).toHaveCount(0);
  await noHorizontalScroll(page);
});

test('the goal withholds an estimate until enough first attempts exist', async ({ page }) => {
  await page.goto('/dev/preview/today?goal=collecting');
  const card = goalCard(page);
  await expect(card.getByText('Collecting evidence')).toBeVisible();
  await expect(card).toContainText('Write 2 more checked pieces at A2 to see where you are.');
  await expect(card.getByRole('progressbar')).toHaveCount(0);
});

for (const [state, title, action] of [
  ['none', 'Set your goal', 'Set your goal'],
  ['no-target', 'Add a target to your goal', 'Add a target'],
] as const)
  test(`a learner with ${state === 'none' ? 'no goal' : 'no target'} is asked to set one`, async ({
    page,
  }) => {
    await page.goto('/dev/preview/today?goal=' + state);
    const card = goalCard(page);
    await expect(card.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(card.getByRole('link', { name: action })).toHaveAttribute(
      'href',
      '/dev/preview/onboarding',
    );
    await expect(card.getByText(caption)).toHaveCount(0);
  });

test('Progress opens with the goal panel', async ({ page }) => {
  await page.goto('/dev/preview/progress');
  const panel = page.getByRole('region', { name: 'Your goal' });
  await expect(panel).toContainText('Write at B1');
  await expect(panel.getByText(caption)).toBeVisible();
});

test('the goal card reads in Vietnamese at phone width', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile', 'Phone-width check');
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.goto('/dev/preview/today?goal=ielts');
  const card = page.getByRole('region', { name: 'Mục tiêu của bạn' });
  await expect(card.getByText('Điểm luyện tập IELTS 4', { exact: false })).toBeVisible();
  await expect(card.getByText('Đang kéo bạn lại', { exact: false })).toBeVisible();
  await expect(card).toContainText('không phải điểm band IELTS');
  await noHorizontalScroll(page);
  await context.clearCookies();
});
