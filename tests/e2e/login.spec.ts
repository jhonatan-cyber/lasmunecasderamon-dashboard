import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER ?? 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'REMOVED_PASSWORD';

test.describe('Login flow', () => {
  test('1. /login carga sin errores de Server Component', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('pageerror', err => serverErrors.push(err.message));
    page.on('response', res => {
      if (res.status() === 500) serverErrors.push(`HTTP 500: ${res.url()}`);
    });

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
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
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

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
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill('usuario_invalido_xyz');
    await page.locator('#password').fill('wrongpassword123');
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(4000);
    expect(page.url()).not.toContain('/dashboard');
    console.log('✓ Login inválido permanece en /login:', page.url());
  });

  test('4. Login exitoso con admin / REMOVED_PASSWORD', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
    await page.locator('#nick').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD);
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

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20_000 });
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
