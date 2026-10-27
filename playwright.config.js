import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 7'],
    viewport: { width: 360, height: 780 },
    timezoneId: 'Africa/Harare',
    locale: 'en-GB'
  },
  webServer: {
    command: 'node tools/serve.js 4173',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true
  }
});
