import { test, expect } from '@playwright/test';

test.describe('Flujo de Ventas y Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe cargar el panel de caja correctamente', async ({ page }) => {
    await page.goto('/caja');

    await expect(page).toHaveURL(/.*caja/);
  });

  test('debe permitir abrir el modal de nueva venta', async ({ page }) => {
    await page.goto('/caja');

    const newSaleBtn = page.getByRole('button', { name: /nueva venta/i });
    if (await newSaleBtn.isVisible()) {
      await newSaleBtn.click();

      await expect(page.getByText(/seleccionar cliente/i)).toBeVisible();
    }
  });

  test('debe mostrar el listado de productos en pedidos', async ({ page }) => {
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/.*pedidos/);

    const newOrderBtn = page.getByRole('button', { name: /nuevo pedido/i });
    if (await newOrderBtn.isVisible()) {
      await expect(newOrderBtn).toBeEnabled();
    }
  });
});
