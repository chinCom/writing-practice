import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/journey',
  testMatch: '*.spec.ts',
  workers: 1,
  expect: { timeout: 20000 },
  timeout: 120000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/journey' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'node --import tsx tests/journey/server.ts',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
