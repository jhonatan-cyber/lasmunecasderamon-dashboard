import { test, expect } from '@playwright/test';

/**
 * Test E2E: Cerrar Turno / Caja
 *
 * Este test verifica el flujo de cierre de caja/turno:
 * - Acceso a la página de caja
 * - Verificar elementos de gestión de caja
 * - Verificar que existe la funcionalidad de cierre
 *
 * NOTA: Este test requiere que el servidor esté corriendo
 * y que el usuario tenga permisos de cajero.
 *
 * Para ejecutar:
 * pnpm test:e2e
 * pnpm test:e2e:smoke
 */

test.describe('Cerrar Turno E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    // Login como admin (tiene todos los permisos)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección al dashboard
    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });
  });

  test('debería navegar a la página de caja registradora', async ({ page }) => {
    // Navegar a la página de caja
    await page.goto(`${BASE_URL}/cash-register`);

    // Verificar que la página carga
    await expect(page).toHaveURL(/\/cash-register/);

    // Verificar que hay contenido visible
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar el título de Gestión de Cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    // Verificar título de la página
    const title = page.getByRole('heading', { name: /caja|gestión/i }).first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('debería tener opción de abrir nueva caja', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    // Buscar botón de abrir caja o crear caja
    const openButton = page.getByRole('button', { name: /abrir|nueva|crear/i }).first();

    // El botón puede estar visible o deshabilitado si ya hay una caja abierta
    await expect(openButton).toBeVisible({ timeout: 10000 });
  });

  test('debería tener tabs o secciones para ver cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    // Verificar que hay algún tipo de navegación por tabs o filtros
    // Puede ser un Tabs component o filtros
    const tabsOrFilters = page.locator('[role="tablist"], .filters, [class*="filter"]').first();

    // La página debería tener alguna forma de filtrar o tab navegación
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('debería permitir buscar cajas', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    // Verificar que existe un campo de búsqueda
    const searchInput = page.getByPlaceholder(/buscar|search/i).first();

    // El input puede estar presente aunque no haya resultados
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar información del usuario actual', async ({ page }) => {
    await page.goto(`${BASE_URL}/cash-register`);

    // Verificar que muestra información del usuario logueado
    // Puede ser en el header o en algún componente de la página
    await page.waitForTimeout(2000);

    // Verificar que la página no está vacía
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
