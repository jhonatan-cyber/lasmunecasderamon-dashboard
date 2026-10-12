import { expect, it } from 'vitest';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';
import { parseOpcionesVenta } from '@/modules/inventario/helpers';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';
const prices = [
  { precio: 6000, comision: 1000 },
  { precio: 8000, comision: 2000 }
];
const options = [{ tipo: 'shot', precio: 3000, comision: 0, precios_anfitriona: prices }];
it('el servidor elimina la comisión de cliente y conserva la de anfitriona', () => {
  const base = {
    producto_id: 'p',
    tipo_venta: 'shot',
    precio: 6000,
    comision: 1000,
    cantidad: 1,
    hostesses: ['ana']
  };
  const details = SaleCreateSchema.shape.detalles.parse([base, { ...base, shot_anfitriona: true }]);
  expect(details[0]).toMatchObject({ comision: 0, hostesses: [] });
  expect(details[1]).toMatchObject({ comision: 1000, hostesses: ['ana'] });
});
it('conserva los precios al guardar y leer en backend y frontend', () => {
  const parsed = SaleOptionsSchema.parse(options);
  expect(parseSavedOptions(JSON.stringify(parsed))?.[0].precios_anfitriona).toEqual(prices);
  expect(parseOpcionesVenta(JSON.stringify(parsed))?.[0].precios_anfitriona).toEqual(prices);
});
it('elige cada precio con su comisión y deja el cliente sin comisión', () => {
  const product = { opciones_venta: options };
  const venta = resolverVentaProducto(product, 'shot_anfitriona:1');
  expect(venta).toMatchObject({ precio: 8000, comision: 2000, esShot: true });
  expect(
    venta.opciones.filter(option => option.esShot).map(option => [option.precio, option.comision])
  ).toEqual([
    [3000, 0],
    [6000, 1000],
    [8000, 2000]
  ]);
});
it('rechaza precios duplicados, negativos y comisiones superiores al precio', () => {
  for (const rows of [
    [prices[0], prices[0]],
    [{ precio: -1, comision: 0 }],
    [{ precio: 1000, comision: 2000 }]
  ]) {
    expect(SaleOptionsSchema.safeParse([{ ...options[0], precios_anfitriona: rows }]).success).toBe(
      false
    );
  }
});
it('conserva precio y comisión anteriores para la anfitriona y elimina la comisión del cliente', () => {
  const product = {
    opciones_venta: [{ tipo: 'shot', precio: 3000, comision: 1000, precio_anfitriona: 6000 }]
  };
  expect(resolverVentaProducto(product, 'shot_anfitriona')).toMatchObject({
    precio: 6000,
    comision: 1000
  });
  expect(resolverVentaProducto(product, 'shot')).toMatchObject({ precio: 3000, comision: 0 });
});
