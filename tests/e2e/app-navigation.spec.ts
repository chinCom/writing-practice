import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const destinations = [
  { name: 'Learning path', path: '/dev/preview/path' },
  { name: 'Writing Studio', path: '/dev/preview/write' },
  { name: 'Practice', path: '/dev/preview/practice-page' },
  { name: 'Progress', path: '/dev/preview/progress' },
  { name: 'Portfolio', path: '/dev/preview/portfolio' },
  { name: 'Settings', path: '/settings' },
  { name: 'Today', path: '/today' },
];

async function navigationAppearance(navigation: Locator) {
  return navigation.evaluate((element) => {
    const sidebar = element.parentElement!;
    const links = Array.from(element.querySelectorAll('a'));
    const label = links[0].querySelector('span')!;
    const icon = links[0].querySelector('svg')!;
    const selected = element.querySelector('[aria-current="page"]')!;
    const logo = sidebar.querySelector('p')!;
    const footer = sidebar.querySelector('footer');

    function typography(node: Element) {
      const styles = getComputedStyle(node);
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
      };
    }

    return {
      width: sidebar.getBoundingClientRect().width,
      background: getComputedStyle(sidebar).backgroundColor,
      color: getComputedStyle(sidebar).color,
      logo: typography(logo),
      label: typography(label),
      iconSize: getComputedStyle(icon).fontSize,
      itemHeights: links.map((link) => link.getBoundingClientRect().height),
      selectedBackground: getComputedStyle(selected).backgroundColor,
      selectedColor: getComputedStyle(selected).color,
      footer: footer
        ? {
            top: footer.getBoundingClientRect().top,
            height: footer.getBoundingClientRect().height,
            text: typography(footer.querySelector('a, button')!),
          }
        : null,
    };
  });
}

test('navigation temporarily hides account identity but keeps account access', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/portfolio');
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  const navigation =
    info.project.name === 'mobile' ? page.getByRole('dialog') : page.getByRole('complementary');
  await expect(navigation.getByText('Your account', { exact: true })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`desktop navigation keeps the Today appearance across pages in ${colorScheme} mode`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'Desktop sidebar only');
    await page.emulateMedia({ colorScheme });
    await page.goto('/dev/preview/today');
    await page.evaluate(() => document.fonts.ready);

    const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    const appearance = await navigationAppearance(navigation);
    expect(appearance.width).toBe(228);
    expect(appearance.label.fontSize).toBe('15px');
    expect(appearance.footer).not.toBeNull();
    const originalNavigation = await navigation.elementHandle();

    for (const destination of destinations) {
      await navigation.getByRole('link', { name: destination.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(destination.path + '$'));
      await expect(
        navigation.getByRole('link', { name: destination.name, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect.poll(() => navigationAppearance(navigation)).toEqual(appearance);
      await expect(page.getByRole('main')).toHaveCSS('margin-left', '244px');
      await expect(
        page.getByRole('complementary').getByRole('link', { name: 'Sign in' }),
      ).toBeVisible();
      expect(await originalNavigation!.evaluate((element) => element.isConnected)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );

      if (destination.name === 'Settings') {
        await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '48px');
      }
      if (destination.name === 'Today') {
        await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '48px');
      }
    }
  });

  test(`mobile menu keeps its appearance and account access across pages in ${colorScheme} mode`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'mobile', 'Mobile menu only');
    await page.emulateMedia({ colorScheme });
    await page.goto('/dev/preview/today');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog');
    await expect.poll(() => menu.evaluate((element) => element.getBoundingClientRect().x)).toBe(0);
    const navigation = menu.getByRole('navigation', { name: 'Main navigation', exact: true });
    const appearance = await navigationAppearance(navigation);
    expect(appearance.footer).not.toBeNull();

    for (const destination of destinations) {
      await navigation.getByRole('link', { name: destination.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(destination.path + '$'));
      await expect(menu).toBeHidden();
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(
        navigation.getByRole('link', { name: destination.name, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect.poll(() => navigationAppearance(navigation)).toEqual(appearance);
      await expect(menu.getByRole('link', { name: 'Sign in' })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByRole('main')).toHaveCSS('margin-left', '0px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
