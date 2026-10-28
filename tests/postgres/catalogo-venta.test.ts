import { expect, it } from 'vitest';

import { listarParaVenta } from '@/modules/inventario';

/**
 * El catálogo de venta (`/api/products?for_sale=1`) alimenta las pantallas de
 * venta y el modal de cortesías de la app. Un error de sintaxis en su SQL no lo
 * detecta ningún test unitario —los mocks no ejecutan Postgres— y en el
 * dispositivo solo aparece como "Error interno del servidor".
 *
 * El 2026-10-27 un cambio dejó `pr.categoria_idWHERE EXISTS` (sin salto de
 * línea) y perdió el filtro `u.estado = 'almacen'`: la app no cargaba las
 * bebidas para entregar. Esta prueba ejecuta la consulta real contra la base
 * local para que ese fallo se vea acá y no en la barra.
 */

it('lista las presentaciones con stock sin romper el SQL', async () => {
  const filas = await listarParaVenta();

  expect(Array.isArray(filas)).toBe(true);
  for (const fila of filas) {
    expect(typeof fila.presentacion_id).toBe('string');
    expect(typeof fila.presentacion_nombre).toBe('string');
    expect(Number.isFinite(Number(fila.precio_venta))).toBe(true);
    // El stock se cuenta con unidades activas en la barra: si el EXISTS deja de
    // filtrar por estado, aparecen filas con stock 0 y esta aserción lo caza.
    expect(Number(fila.stock_bar)).toBeGreaterThan(0);
  }
});

it('aplica la búsqueda por término con parámetros vinculados', async () => {
  const filas = await listarParaVenta({ term: 'a' });

  expect(Array.isArray(filas)).toBe(true);
  for (const fila of filas) {
    expect(Number(fila.stock_bar)).toBeGreaterThan(0);
  }
});
