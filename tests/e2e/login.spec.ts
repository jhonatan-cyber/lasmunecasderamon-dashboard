import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER ?? 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD;

function skipWithoutPassword() {
  test.skip(!TEST_PASSWORD, 'TEST_PASSWORD no definida — test de login omitido (opcional)');
}

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

test.describe('Login flow', () => {
  test('1. /login carga sin errores de Server Component', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('pageerror', err => serverErrors.push(err.message));
    page.on('response', res => {
      if (res.status() === 500) serverErrors.push(`HTTP 500: ${res.url()}`);
    });

    await gotoLoginHydrated(page);
    await page.waitForTimeout(2000);

    const fatal = serverErrors.filter(
      e =>
        e.includes('useRef') ||
        e.includes('only works in Client') ||
        e.includes('Server Component') ||
        e.includes('HTTP 500')
    );
    expect(fatal, `Fatal errors: ${fatal.join(' | ')}`).toHaveLength(0);
    console.log('✓ Sin errores de Server Component en /login');
  });

  test('2. Formulario de login es visible', async ({ page }) => {
    await gotoLoginHydrated(page);

    // Wait for React hydration — in production builds JS loads async
    const userInput = page.locator('#nick');
    const passInput = page.locator('#password');
    const submitBtn = page.locator('button[type="submit"]').first();

    await userInput.waitFor({ state: 'visible', timeout: 20_000 });
    await expect(passInput).toBeVisible({ timeout: 10_000 });
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
    await expect(submitBtn).toContainText('Iniciar sesión');
    console.log('✓ Formulario: usuario, contraseña y botón visible');
  });

  test('3. Credenciales inválidas no redirigen al dashboard', async ({ page }) => {
    await gotoLoginHydrated(page);

    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill('usuario_invalido_xyz');
    await page.locator('#password').fill('wrongpassword123');
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(4000);
    expect(page.url()).not.toContain('/dashboard');
    console.log('✓ Login inválido permanece en /login:', page.url());
  });

  test('4. Login exitoso con credenciales válidas', async ({ page }) => {
    skipWithoutPassword();
    await gotoLoginHydrated(page);

    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();

    // May require code verification step — handle both flows
    const isCodeStep = await page
      .locator('input[placeholder="0000"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isCodeStep) {
      console.log(
        '⚠  Paso de verificación de código detectado — omitiendo (requiere código manual)'
      );
      test.skip();
      return;
    }

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });
    const finalUrl = page.url();
    console.log('✓ Login exitoso, redirigido a:', finalUrl);
    expect(finalUrl).not.toContain('/login');
  });

  test('5. Navegación asistencia-qr → login sin error useRef', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('pageerror', err => serverErrors.push(err.message));
    page.on('response', res => {
      if (res.status() === 500) serverErrors.push(`HTTP 500: ${res.url()}`);
    });

    await page.goto(`${BASE}/asistencia-qr`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('asistencia-qr');
    console.log('✓ En /asistencia-qr');

    // Button renders as "Volver al Login" — could be <a> or <button> depending on hydration
    const backBtn = page
      .getByRole('link', { name: /volver al login/i })
      .or(page.getByRole('button', { name: /volver al login/i }))
      .first();

    await expect(backBtn).toBeVisible({ timeout: 10_000 });
    await backBtn.click();

    await page.waitForURL(`**\/login`, { timeout: 10_000 });
    await page.waitForTimeout(2000);
    console.log('✓ Llegué a /login desde asistencia-qr');

    const fatal = serverErrors.filter(
      e =>
        e.includes('useRef') ||
        e.includes('only works in Client') ||
        e.includes('Server Component') ||
        e.includes('HTTP 500')
    );
    expect(fatal, `Errores en navegación: ${fatal.join(' | ')}`).toHaveLength(0);
    console.log('✓ Sin errores useRef en navegación asistencia-qr → login');
  });
});

test.describe('Session persistence', () => {
  test('6. Sesión persiste después de recargar la página', async ({ page }) => {
    test.setTimeout(60_000);
    skipWithoutPassword();

    await gotoLoginHydrated(page);
    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();

    // Handle optional 2FA code step
    const codeStep = page.locator('input[placeholder="0000"]');
    if (await codeStep.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('⚠  Código 2FA detectado — saltando test');
      test.skip();
      return;
    }

    // Wait for redirect away from login
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });
    const dashboardUrl = page.url();
    console.log('✓ Dashboard tras login:', dashboardUrl);

    // Refresh the page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Should still be on dashboard after refresh
    const afterRefreshUrl = page.url();
    console.log('✓ URL tras refresh:', afterRefreshUrl);
    expect(afterRefreshUrl).not.toContain('/login');
  });

  test('7. Auto-refresh funciona cuando el access token expira', async ({ page, context }) => {
    test.setTimeout(60_000);
    skipWithoutPassword();

    await gotoLoginHydrated(page);
    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();

    const codeStep = page.locator('input[placeholder="0000"]');
    if (await codeStep.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('⚠  Código 2FA detectado — saltando test');
      test.skip();
      return;
    }

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });

    // Ensure we have a refresh_token cookie (httpOnly — must check via context, not document.cookie)
    const refreshCookie = (await context.cookies()).find(c => c.name === 'refresh_token');
    console.log('✓ refresh_token cookie presente:', !!refreshCookie);
    expect(refreshCookie).toBeTruthy();

    // Remove the access token cookie to simulate expiration (httpOnly — must use context API)
    await context.clearCookies({ name: 'token' });

    // Navigate — proxy should auto-refresh via refresh_token cookie
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

    // Should NOT redirect to login
    const finalUrl = page.url();
    console.log('✓ URL tras remover token:', finalUrl);
    expect(finalUrl).not.toContain('/login');
    expect(finalUrl).toContain('/dashboard');
  });

  test('8. Logout limpia la sesión y redirige al login', async ({ page }) => {
    test.setTimeout(60_000);
    skipWithoutPassword();

    // Login first
    await gotoLoginHydrated(page);
    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();

    const codeStep = page.locator('input[placeholder="0000"]');
    if (await codeStep.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('⚠  Código 2FA detectado — saltando test');
      test.skip();
      return;
    }

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });
    console.log('✓ Login exitoso');

    // Logout via POST (route only handles POST)
    const logoutResp = await page.request.post(`${BASE}/api/auth/logout`);
    expect(logoutResp.ok()).toBeTruthy();
    console.log('✓ Logout endpoint OK');

    // Try to access dashboard — should redirect to login
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const afterLogoutUrl = page.url();
    console.log('✓ URL tras logout:', afterLogoutUrl);
    expect(afterLogoutUrl).toContain('/login');
  });
});
