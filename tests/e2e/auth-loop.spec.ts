import { expect, loginAsAdmin, requireAdmin, test } from './fixtures/admin';

test('no auth loop: /api/auth/me no se llama más de 2 veces en 10 segundos tras login', async ({
  page,
  admin
}) => {
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

  await loginAsAdmin(page, requireAdmin(admin));

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
