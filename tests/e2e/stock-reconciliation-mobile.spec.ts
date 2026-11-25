import { expect, loginAsAdmin, requireAdmin, test } from './fixtures/admin';

test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

test('conciliar una unidad desde un móvil sin desbordamiento horizontal', async ({
  page,
  admin
}) => {
  test.setTimeout(60_000);
  let solicitud: unknown;
  let conciliado = false;

  await page.route('**/api/products/stock-reconciliation', async route => {
    if (route.request().method() === 'POST') {
      solicitud = route.request().postDataJSON();
      conciliado = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { unidadesActualizadas: 1 } })
      });
      return;
    }

    const data = conciliado
      ? []
      : [
          {
            productoId: 'product-1',
            productoNombre: 'Vino de prueba',
            productoCodigo: 'V-1',
            stockProducto: 1,
            stockUnidades: 1,
            discrepanciaStock: false,
            presentaciones: [
              {
                id: 'legacy',
                nombre: 'Stock legado (formato por confirmar)',
                stockBodega: 1,
                pendiente: true
              },
              { id: 'target', nombre: 'Botella 750 ml', stockBodega: 0, pendiente: false }
            ]
          }
        ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data })
    });
  });

  await loginAsAdmin(page, requireAdmin(admin));
  await page.goto('/products/reconciliation', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Conciliar stock por presentación' })
  ).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(horizontalOverflow).toBe(false);

  await page.getByLabel('Código físico de unidad para Vino de prueba').fill('1234567890128');
  await page.getByLabel('Código físico de unidad para Vino de prueba').press('Enter');
  await page.getByLabel('Presentación confirmada para Vino de prueba').selectOption('target');
  await page.getByRole('button', { name: 'Confirmar 1 unidad' }).click();

  await expect(page.getByText('No hay stock pendiente de conciliación.')).toBeVisible();
  expect(solicitud).toMatchObject({
    productoId: 'product-1',
    presentacionOrigenId: 'legacy',
    presentacionDestinoId: 'target',
    codigosUnidades: ['1234567890128']
  });
});
