import { expect, test } from '@playwright/test';

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`learning path nodes follow ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/dev/preview/path?course=full');
    const lessons = page
      .getByRole('list')
      .filter({ has: page.getByRole('link', { name: 'Names and roles' }) });
    await expect(lessons.getByRole('listitem')).toHaveCount(3);
    await expect(lessons.getByRole('button', { name: /Things I like · Locked/ })).toBeDisabled();
    const node = lessons.getByRole('listitem').first().locator('[aria-hidden="true"]').first();
    const name = await node.evaluate((element) => getComputedStyle(element).animationName);
    if (moves) expect(name).not.toBe('none');
    else expect(name).toBe('none');
  });
}
