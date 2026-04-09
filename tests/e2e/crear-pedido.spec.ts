import { test, expect } from '@playwright/test';

/**
 * Test E2E: Crear Pedido
 *
 * Este test verifica el flujo de creación de pedidos:
 * - Navegación a la página de nuevo pedido
 * - Verificar elementos del formulario
 *
 * NOTA: Este test requiere que el servidor esté corriendo
 * con datos de prueba (clientes, categorías, etc.)
 *
 * Para ejecutar:
 * pnpm test:e2e
 * pnpm test:e2e:smoke
 */

test.describe('Crear Pedido E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    // Primero hacer login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección al dashboard
    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });
  });

  test('debería navegar a la página de nuevo pedido desde el dashboard', async ({ page }) => {
    // Navegar directamente a nuevo pedido
    await page.goto(`${BASE_URL}/orders/new`);

    // Verificar que la página carga
    await expect(page).toHaveURL(/\/orders\/new/);

    // Verificar que existe el formulario o al menos la estructura base
    // La página usa Tabs para productos/servicios
    const tabs = page.locator('[role="tablist"]');
    await expect(tabs).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar las pestañas de productos y servicios', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Verificar pestaña de productos
    const productosTab = page.getByRole('tab', { name: /productos/i });
    await expect(productosTab).toBeVisible({ timeout: 10000 });

    // Verificar pestaña de servicios
    const serviciosTab = page.getByRole('tab', { name: /servicios/i });
    await expect(serviciosTab).toBeVisible();
  });

  test('debería mostrar selector de cliente', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Buscar campo de búsqueda de cliente
    const clienteInput = page.getByPlaceholder(/buscar cliente/i);

    // Puede que tarden en cargar los datos
    await expect(clienteInput).toBeVisible({ timeout: 15000 });
  });

  test('debería tener botón de volver al dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Verificar que existe el botón de volver
    const backButton = page.getByRole('button', { name: /volver|atrás/i }).first();
    await expect(backButton).toBeVisible();
  });
});
