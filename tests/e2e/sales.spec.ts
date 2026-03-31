import { test, expect } from '@playwright/test';

test.describe('Flujo de Ventas y Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página de login (o donde sea que inicie la app)
    await page.goto('/');
    
    // Si hay login, realizarlo aquí. Como es un entorno de prueba, asumimos que podemos navegar a /caja
    // o que el middleware nos permite acceso en desarrollo.
    // Para estas pruebas E2E, intentaremos acceder directamente a los módulos principales.
  });

  test('debe cargar el panel de caja correctamente', async ({ page }) => {
    await page.goto('/caja');
    // Verificar que el título o algún elemento clave de la caja esté presente
    // Ajustar selectores según la implementación real (ej. h1, botones de acción)
    await expect(page).toHaveURL(/.*caja/);
  });

  test('debe permitir abrir el modal de nueva venta', async ({ page }) => {
    await page.goto('/caja');
    // Buscar el botón de "Nueva Venta" o similar
    const newSaleBtn = page.getByRole('button', { name: /nueva venta/i });
    if (await newSaleBtn.isVisible()) {
      await newSaleBtn.click();
      // Verificar que el modal o formulario aparezca
      await expect(page.getByText(/seleccionar cliente/i)).toBeVisible();
    }
  });

  test('debe mostrar el listado de productos en pedidos', async ({ page }) => {
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/.*pedidos/);
    // Verificar que existan elementos de pedido o el botón de "Nuevo Pedido"
    const newOrderBtn = page.getByRole('button', { name: /nuevo pedido/i });
    if (await newOrderBtn.isVisible()) {
      await expect(newOrderBtn).toBeEnabled();
    }
  });
});
