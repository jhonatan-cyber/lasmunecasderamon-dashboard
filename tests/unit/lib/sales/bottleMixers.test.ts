import { expect, it } from 'vitest';
import {
  SaleOptionsSchema,
  ConfiguredSaleOptionsSchema
} from '@/lib/business/schemas/sale-options';
import { completarOpciones } from '@/modules/inventario/helpers';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';
import { parseOpcionesVenta } from '@/modules/inventario/helpers';

it('la configuración exige comisión con precio de botella positivo', () => {
  expect(ConfiguredSaleOptionsSchema.safeParse([{ tipo: 'botella', precio: 50000 }]).success).toBe(
    false
  );
  expect(
    ConfiguredSaleOptionsSchema.safeParse([{ tipo: 'botella', precio: 50000, comision: 0 }]).success
  ).toBe(false);
  expect(
    ConfiguredSaleOptionsSchema.safeParse([{ tipo: 'botella', precio: 50000, comision: 5000 }])
      .success
  ).toBe(true);
  expect(
    ConfiguredSaleOptionsSchema.safeParse([
      { tipo: 'botella', precio: 0, comision: 0, precio_sin_anfitriona: 35000 }
    ]).success
  ).toBe(true);
});

it('conserva el precio sin anfitriona al guardar y ofrece una botella completa sin comisión', () => {
  const options = SaleOptionsSchema.parse([
    {
      tipo: 'botella',
      precio: 50000,
      comision: 5000,
      precio_sin_anfitriona: 35000,
      acompanamiento: { unidades: 3 }
    }
  ]);
  expect(parseOpcionesVenta(JSON.stringify(options))).toEqual(options);
  expect(parseSavedOptions(options)).toEqual(options);
  const resolved = resolverVentaProducto(
    { opciones_venta: options, stock_bar: 4 },
    'botella_sin_anfitriona'
  );
  expect(resolved).toMatchObject({
    tipoVenta: 'botella_sin_anfitriona',
    esShot: false,
    precio: 35000,
    comision: 0,
    maxCantidad: 4
  });
  expect(resolved.opciones).toHaveLength(2);
});
it('guarda solo las unidades y permite elegir la bebida al vender', () => {
  const options = SaleOptionsSchema.parse([
    { tipo: 'botella', precio: 20000, acompanamiento: { unidades: 2 } }
  ]);
  expect(parseSavedOptions(JSON.stringify(completarOpciones(JSON.stringify(options), [])))).toEqual(
    options
  );
  expect(resolverVentaProducto({ opciones_venta: options }).opciones[0].nombre).toBe(
    'Botella · 2 bebidas'
  );
});
it('conserva bebidas en validación, precios y catálogo de venta', () => {
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
it('rechaza cantidades inválidas y bebida en cortos', () => {
  for (const unidades of [-1, 1.5, 1001])
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

it('conserva cero bebidas en configuración y no pide bebida al vender', () => {
  const options = SaleOptionsSchema.parse([
    { tipo: 'botella', precio: 20000, acompanamiento: { unidades: 0 } }
  ]);
  expect(parseSavedOptions(options)).toEqual(options);
  expect(parseOpcionesVenta(JSON.stringify(options))).toEqual(options);
  expect(resolverVentaProducto({ opciones_venta: options }).opciones[0].nombre).toBe('Botella');
});
