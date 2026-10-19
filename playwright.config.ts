import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://127.0.0.1:3000',
    // Target UI specs need the growth switch on; a reused server must also start with it.
    env: { GROWTH_TARGETS: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
