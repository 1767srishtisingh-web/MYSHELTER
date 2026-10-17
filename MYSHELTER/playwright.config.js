// End-to-end tests in a real browser. Run: npm run test:e2e
// First time only: npx playwright install chromium
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    timezoneId: 'Asia/Kolkata',
    locale: 'en-IN',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: `npm run build && node scripts/serve.js dist`,
    url: `http://127.0.0.1:${PORT}`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
