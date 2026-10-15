import { expect, test } from '@playwright/test';

const longText = Array.from({ length: 90 }, (_, index) => 'word' + index).join(' ');
const entry = (id: string, attempt: number, text: string, wordCount: number) => ({
  id,
  createdAt: '2026-10-13T12:00:00Z',
  text,
  wordCount,
  attempt,
  parentSubmissionId: null,
  scores: { task: 3, organization: 3, grammar: 3, vocabulary: 3 },
});

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`portfolio entries follow ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.route('**/dev/preview/portfolio-data*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        json: {
          ok: true,
          data: {
            entries: [
              entry('00000000-0000-4000-8000-000000000301', 2, longText, 90),
              entry('00000000-0000-4000-8000-000000000302', 1, 'I go to the beach.', 5),
            ],
            nextOffset: null,
          },
        },
      });
    });
    await page.goto('/dev/preview/portfolio');
    await expect(page.getByRole('status')).toHaveText('Loading saved writing…');
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(2);
    const longEntry = page.getByText(longText.slice(0, 20));
    await expect(longEntry).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    const clamp = () => longEntry.evaluate((element) => getComputedStyle(element).webkitLineClamp);
    expect(await clamp()).toBe('4');
    const toggle = page.getByRole('button', { name: 'Show full text' });
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(await clamp()).toBe('none');
    const card = page
      .getByText('Version 2', { exact: true })
      .locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
    const name = await card.evaluate((element) => getComputedStyle(element).animationName);
    if (moves) expect(name).not.toBe('none');
    else expect(name).toBe('none');
  });
}
