import { expect, it } from 'vitest';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';
import { completarOpciones } from '@/modules/inventario/helpers';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';
it('conserva acompañamientos en validación, precios y catálogo de venta', () => {
  const options = SaleOptionsSchema.parse([
    { tipo: 'botella', precio: 20000, acompanamiento: { tipo: 'soda', unidades: 3 } }
  ]);
  const loaded = completarOpciones(JSON.stringify(options), []);
  expect(loaded).toEqual(options);
  expect(parseSavedOptions(JSON.stringify(loaded))).toEqual(options);
  expect(resolverVentaProducto({ opciones_venta: loaded }).opciones[0].nombre).toBe(
    'Botella · 3 sodas'
  );
});
it('rechaza cantidades inválidas y acompañamiento en cortos', () => {
  for (const unidades of [0, -1, 1.5, 1001])
    expect(
      SaleOptionsSchema.safeParse([
        { tipo: 'botella', precio: 10000, acompanamiento: { tipo: 'gaseosa', unidades } }
      ]).success
    ).toBe(false);
  expect(
    SaleOptionsSchema.safeParse([
      { tipo: 'shot', precio: 10000, acompanamiento: { tipo: 'soda', unidades: 1 } }
    ]).success
  ).toBe(false);
  expect(SaleOptionsSchema.parse([{ tipo: 'botella', precio: 10000 }])[0]).not.toHaveProperty(
    'acompanamiento'
  );
});
