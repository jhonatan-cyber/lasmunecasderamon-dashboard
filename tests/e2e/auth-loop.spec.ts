import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER ?? 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD;

/**
 * Abre /login y espera a que React esté hidratado: el fetch de montaje de la pantalla
 * (`check-users`) solo corre en el cliente, así que su respuesta garantiza que el
 * formulario ya responde a clics. Sin esta espera, en dev con compilación on-demand
 * el clic se pierde y el login nunca ocurre.
 */
async function gotoLoginHydrated(page: Page) {
  const usersLoaded = page.waitForResponse(
    r => r.url().includes('/api/auth/check-users') && r.status() === 200,
    { timeout: 30_000 }
  );
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await usersLoaded;
}

test('no auth loop: /api/auth/me no se llama más de 2 veces en 10 segundos tras login', async ({
  page
}) => {
  test.skip(!TEST_PASSWORD, 'TEST_PASSWORD no definida — test omitido (opcional)');
  test.setTimeout(60_000);
  const authMeCalls: number[] = [];
  const loginRedirects: string[] = [];

  // Track every /api/auth/me request
  page.on('request', req => {
    if (req.url().includes('/api/auth/me')) {
      authMeCalls.push(Date.now());
    }
    if (req.url().includes('/login?redirect=')) {
      loginRedirects.push(req.url());
    }
  });

  // Login
  await gotoLoginHydrated(page);
  await page.locator('#nick').waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('#nick').fill(TEST_USER);
  await page.locator('#password').fill(TEST_PASSWORD!);
  await page.locator('button[type="submit"]').first().click();

  // Wait for redirect to dashboard
  await page.waitForURL(`**\/dashboard`, { timeout: 30_000, waitUntil: 'domcontentloaded' });
  console.log('✓ Llegó al dashboard:', page.url());

  // Reset counters after login completes — only measure steady state
  authMeCalls.length = 0;
  loginRedirects.length = 0;

  // Observe for 10 seconds
  await page.waitForTimeout(10_000);

  console.log(`/api/auth/me calls in 10s: ${authMeCalls.length}`);
  console.log(`/login?redirect= requests in 10s: ${loginRedirects.length}`);
  if (loginRedirects.length > 0) {
    console.error('Unexpected login redirects:', loginRedirects);
  }

  // /api/auth/me should fire at most once on mount, not repeatedly
  // Allow up to 2 (initial fetch + one possible retry), anything more is a loop
  expect(
    authMeCalls.length,
    `Loop detectado: /api/auth/me llamado ${authMeCalls.length} veces en 10s`
  ).toBeLessThanOrEqual(2);

  // There should be zero redirects back to login while authenticated
  expect(loginRedirects.length, `Redirects a /login detectados: ${loginRedirects.join(', ')}`).toBe(
    0
  );

  console.log('✓ Sin loop de autenticación confirmado');
});
