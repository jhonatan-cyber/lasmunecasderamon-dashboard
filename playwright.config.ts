import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const port = new URL(baseURL).port || '3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 1,
  timeout: 30_000,
  // `list` en local y `dot` en CI es el default de Playwright; se declara para
  // poder sumar el reporter que falla el run si un spec supera el presupuesto
  // de duración por archivo (ver scripts/playwright/duration-budget-reporter.ts).
  // El reporter se carga por ruta porque `reporter` solo acepta tuplas.
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    ['./scripts/playwright/duration-budget-reporter.ts']
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
