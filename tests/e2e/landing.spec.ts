import { expect, test } from '@playwright/test';

test('signed-out visitors can try the live demo without an API request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Write in English. See what to fix.',
  );
  const result = page.getByRole('region', { name: 'Your marked sentence' });
  await expect(result.locator('[data-mark]')).toHaveCount(3);
  await expect(result).toContainText('consider “ate”');
  await result.getByRole('button', { name: /eated/ }).click();
  await expect(result.getByRole('button', { name: /eated/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const demo = page.getByRole('textbox', { name: 'Try it: edit this sentence' });
  await demo.fill('Yesterday I went to the park and ate an ice cream.');
  await expect(result.locator('[data-mark]')).toHaveCount(0);
  await expect(result).toContainText('No mistakes found');
  await demo.fill('We buyed a cake.');
  await expect(result.getByRole('button', { name: 'buyed: bought' })).toBeVisible();
  expect(requests).toEqual([]);

  const starts = page.getByRole('link', { name: 'Start writing for free' });
  await expect(starts).toHaveCount(3);
  for (const start of await starts.all()) await expect(start).toHaveAttribute('href', '/login');
});

for (const [link, heading, section] of [
  ['Privacy policy', 'Privacy policy', 'AI processing'],
  ['Terms of use', 'Terms of use', 'AI feedback and levels'],
] as const) {
  test('the landing page links to the ' + heading, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: link }).click();
    await expect(page).toHaveURL(link === 'Privacy policy' ? '/privacy' : '/terms');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Draft under legal review');
  });
}

test('the privacy policy discloses third-party AI processing', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('main')).toContainText(
    'Your writing is processed by a third-party AI provider, DeepSeek.',
  );
});

test('signed-out visitors see a marketing page without the app navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Today' })).toHaveCount(0);
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/login');
  for (const name of [
    'How it works',
    'Built for real writing practice',
    'Start at your level',
    'Pricing',
    'Frequently asked questions',
  ])
    await expect(page.getByRole('region', { name })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pricing' })).toContainText('Free');
  await expect(
    page.getByRole('region', { name: 'Start at your level' }).getByRole('listitem'),
  ).toHaveCount(7);

  const question = page.getByRole('button', { name: 'What happens to my writing?' });
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Frequently asked questions' })).toContainText(
    'DeepSeek',
  );
  await expect(
    page.getByRole('contentinfo').getByRole('navigation', { name: 'Legal' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('section links scroll below the sticky header on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Section links are hidden on small screens');
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Landing page' })
    .getByRole('link', { name: 'FAQ' })
    .click();
  await expect(page).toHaveURL(/#faq$/);
  const heading = page.getByRole('heading', { name: 'Frequently asked questions' });
  const headerBottom =
    (await page.getByRole('banner').boundingBox())!.y +
    (await page.getByRole('banner').boundingBox())!.height;
  await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThan(headerBottom);
});

test('the language switch shows the landing page in Vietnamese', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Interface language' })
    .getByRole('button', { name: 'VI' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
    'Write in English. See what to fix.',
  );
  await expect(page.getByRole('heading', { name: 'Câu hỏi thường gặp' })).toBeVisible();
  await context.clearCookies();
});
