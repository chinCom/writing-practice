import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance',
  outputDir: './test-results/performance',
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node --import tsx tests/journey/server.ts',
    env: {
      JOURNEY_APP_MODE: 'production',
      PERFORMANCE_LOGS: 'true',
      PERFORMANCE_TELEMETRY: 'true',
      PERFORMANCE_SAMPLE_RATE: '1',
    },
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
