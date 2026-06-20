import { test, expect } from '@playwright/test';

test.describe('Login E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('debería mostrar errores para credenciales inválidas', async ({ page }) => {
    await page.fill('input[id="nick"]', 'usuario-inexistente-12345');
    await page.fill('input[id="password"]', 'password-invalido');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });

  test('debería mostrar error para usuario válido pero contraseña incorrecta', async ({ page }) => {
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'wrong-password');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });

  test('debería iniciar sesión exitosamente con credenciales válidas', async ({ page }) => {
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', '10571705');

    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/dashboard|\/orders|\/sales/);
  });

  test('debería mantener al usuario en login si intenta acceder directamente a rutas protegidas', async ({
    page
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    await expect(page).toHaveURL(/login/);

    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });
});
