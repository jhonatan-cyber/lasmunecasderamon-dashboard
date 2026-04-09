import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT || '3100';
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const configDir = __dirname;
const nextBin = path.join(configDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const webServerCommand =
  process.platform === 'win32'
    ? `cd /d "${configDir}" && node "${nextBin}" start --hostname 0.0.0.0 --port ${port}`
    : `cd "${configDir}" && node "${nextBin}" start --hostname 0.0.0.0 --port ${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },
  webServer: {
    command: webServerCommand,
    url: baseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
