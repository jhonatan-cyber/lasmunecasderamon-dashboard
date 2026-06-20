import { test, expect } from '@playwright/test';



test.describe('Crear Pedido E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]');

    
    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });
  });

  test('debería navegar a la página de nuevo pedido desde el dashboard', async ({ page }) => {
    
    await page.goto(`${BASE_URL}/orders/new`);

    
    await expect(page).toHaveURL(/\/orders\/new/);

    
    
    const tabs = page.locator('[role="tablist"]');
    await expect(tabs).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar las pestañas de productos y servicios', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    
    const productosTab = page.getByRole('tab', { name: /productos/i });
    await expect(productosTab).toBeVisible({ timeout: 10000 });

    
    const serviciosTab = page.getByRole('tab', { name: /servicios/i });
    await expect(serviciosTab).toBeVisible();
  });

  test('debería mostrar selector de cliente', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    
    const clienteInput = page.getByPlaceholder(/buscar cliente/i);

    
    await expect(clienteInput).toBeVisible({ timeout: 15000 });
  });

  test('debería tener botón de volver al dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    
    const backButton = page.getByRole('button', { name: /volver|atrás/i }).first();
    await expect(backButton).toBeVisible();
  });
});
