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

  await expect(page.getByRole('link', { name: 'Start writing for free' })).toHaveAttribute(
    'href',
    '/login',
  );
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
