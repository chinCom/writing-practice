import { expect, test } from '@playwright/test';

const expected = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

for (const path of ['/', '/privacy', '/api/progress']) {
  test('baseline security headers are sent on ' + path, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    for (const [name, value] of Object.entries(expected)) expect(headers[name]).toBe(value);
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['permissions-policy']).toContain('camera=()');
  });
}

test('the landing page renders and runs its demo under the policy', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.goto('/');
  const demo = page.getByRole('textbox', { name: 'Try it: edit this sentence' });
  await demo.fill('We buyed a cake.');
  await expect(page.getByRole('button', { name: 'buyed: bought' })).toBeVisible();
  expect(violations).toEqual([]);
});
