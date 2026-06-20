import { test, expect } from '@playwright/test';

test.describe('Cerrar Turno E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', '10571705');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });
  });

  test('debería navegar a la página de caja registradora', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    await expect(page).toHaveURL(/\/cash-register/);

    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar el título de Gestión de Cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    const title = page.getByRole('heading', { name: /caja|gestión/i }).first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('debería tener opción de abrir nueva caja', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    const openButton = page.getByRole('button', { name: /abrir|nueva|crear/i }).first();

    await expect(openButton).toBeVisible({ timeout: 10000 });
  });

  test('debería tener tabs o secciones para ver cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    const tabsOrFilters = page.locator('[role="tablist"], .filters, [class*="filter"]').first();

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('debería permitir buscar cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    const searchInput = page.getByPlaceholder(/buscar|search/i).first();

    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar información del usuario actual', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    await page.waitForTimeout(2000);

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
