import { expect, test } from '@playwright/test';

for (const screen of ['live-write', 'write']) {
  test(`${screen} scrolls long writing inside the textbox without expanding the page`, async ({
    page,
  }, info) => {
    if (info.project.name === 'desktop') await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dev/preview/' + screen);
    const writing = page.getByRole('textbox', { name: 'Your writing' });
    await writing.fill('A short message.');
    await page.evaluate(() => document.fonts.ready);
    const shortHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const longText = Array.from({ length: 55 }, (_, index) => `Line ${index + 1} of my weekend.`)
      .join('\n')
      .slice(0, screen === 'live-write' ? 1200 : 20000);
    await writing.fill(longText);
    await expect
      .poll(() => writing.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      shortHeight + 2,
    );
    await writing.scrollIntoViewIfNeeded();
    await writing.focus();
    const pageScroll = await page.evaluate(() => scrollY);
    await page.keyboard.press('Control+End');
    await expect.poll(() => writing.evaluate((element) => element.scrollTop > 0)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
    await expect(writing).toHaveValue(longText);
    await expect(writing).toHaveAttribute('spellcheck', 'false');
    await expect(writing).toHaveAttribute('dir', 'ltr');
    const check = page.getByRole('button', { name: 'Check my writing', exact: true });
    if (info.project.name === 'desktop' && screen === 'live-write')
      await expect(check).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
