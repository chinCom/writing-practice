import { expect, firefox, test } from '@playwright/test';

test.describe('configured Google sign-in', () => {
  test.skip(process.env.RUN_GOOGLE_SIGNIN !== 'true', 'Requires configured Supabase Google OAuth.');

  test('shows the Google logo beside the sign-in label', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByRole('button', { name: 'Continue with Google' });
    await expect(button).toBeEnabled();
    const logo = button.locator('img');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  });

  test('Firefox leaves for Google without a streamed-response runtime error', async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'One Firefox regression covers both loopback hosts.',
    );
    const browser = await firefox.launch();
    try {
      for (const host of ['localhost', '127.0.0.1']) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        // Verify the real provider handoff without entering credentials or selecting an account.
        await page.goto(`http://${host}:3000/login`);
        const redirectResponse = page.waitForResponse(
          (response) => response.url() === `http://${host}:3000/auth/google`,
        );
        await page.getByRole('button', { name: 'Continue with Google' }).click();
        const response = await redirectResponse;
        expect(response.status()).toBe(303);
        await page.waitForURL('https://accounts.google.com/**');
        await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
        const destination = new URL(response.headers().location);
        expect(destination.searchParams.get('provider')).toBe('google');
        expect(destination.searchParams.get('redirect_to')).toBe(
          `http://${host}:3000/auth/callback`,
        );
        expect(destination.searchParams.get('code_challenge')).toBeTruthy();
        expect(
          (await context.cookies(`http://${host}:3000`)).some((cookie) =>
            cookie.name.includes('code-verifier'),
          ),
        ).toBe(true);
        expect(errors).toEqual([]);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  });
});
