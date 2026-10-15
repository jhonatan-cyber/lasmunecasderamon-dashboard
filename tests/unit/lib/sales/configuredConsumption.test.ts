import { describe, expect, it, vi } from 'vitest';
import { validarConfiguracionVenta } from '@/modules/inventario/bar/validarConfiguracionVenta';
import type { TransactionQuery } from '@/lib/database/db';
const config = [
  {
    tipo: 'shot',
    precio: 5000,
    comision: 0,
    ml_acompanamiento_cliente: 0,
    ml_acompanamiento_anfitriona: 150
  },
  { tipo: 'botella', precio: 20000, comision: 1000, acompanamiento: { unidades: 4 } }
];
const trx = vi.fn(async () => [
  { id: 'vodka', opciones_venta: config }
]) as unknown as TransactionQuery;
describe('server configured consumption', () => {
  it('rechaza corto cliente cuando solo existe precio de anfitriona', async () => {
    const onlyHostess = vi.fn(async () => [
      {
        id: 'vodka',
        opciones_venta: [
          {
            tipo: 'shot',
            precio: 0,
            comision: 0,
            precios_anfitriona: [{ precio: 30000, comision: 0 }]
          }
        ]
      }
    ]) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(onlyHostess, [{ presentacion_id: 'vodka', tipo_venta: 'shot' }])
    ).rejects.toThrow('no está configurada');
    await expect(
      validarConfiguracionVenta(onlyHostess, [
        { presentacion_id: 'vodka', tipo_venta: 'shot', shot_anfitriona: true }
      ])
    ).resolves.toBeUndefined();
  });
  it('rejects accompaniment without configured ml for hostess shorts', async () => {
    const optionalTrx = vi.fn(async () => [
      {
        id: 'vodka',
        opciones_venta: [
          { tipo: 'shot', precio: 5000, comision: 0, ml_acompanamiento_anfitriona: 0 }
        ]
      }
    ]) as unknown as TransactionQuery;
    const short = { presentacion_id: 'vodka', tipo_venta: 'shot' as const, shot_anfitriona: true };
    await expect(
      validarConfiguracionVenta(optionalTrx, [
        { ...short, acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 } }
      ])
    ).rejects.toThrow();
    await expect(
      validarConfiguracionVenta(optionalTrx, [
        { ...short, acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 } }
      ])
    ).rejects.toThrow();
  });
  it('client shorts require one whole unit of the selected accompaniment', async () => {
    const short = { presentacion_id: 'vodka', tipo_venta: 'shot' as const };
    await expect(
      validarConfiguracionVenta(trx, [
        { ...short, acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 } }
      ])
    ).resolves.toBeUndefined();
    await expect(
      validarConfiguracionVenta(trx, [
        { ...short, acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 } }
      ])
    ).rejects.toThrow();
  });
  it('accepts no mixer for a client short configured with zero ml', async () => {
    await expect(
      validarConfiguracionVenta(trx, [{ presentacion_id: 'vodka', tipo_venta: 'shot' }])
    ).resolves.toBeUndefined();
  });
  it('uses complete units regardless of old mixer ml settings', async () => {
    await expect(
      validarConfiguracionVenta(trx, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          acompanamiento_corto: { presentacion_id: 'sprite', unidades: 2 }
        }
      ])
    ).rejects.toThrow();
    await expect(
      validarConfiguracionVenta(trx, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
        }
      ])
    ).resolves.toBeUndefined();
  });
  it('rejects a bottle without all configured accompaniment units', async () => {
    await expect(
      validarConfiguracionVenta(trx, [{ presentacion_id: 'vodka', tipo_venta: 'botella' }])
    ).rejects.toThrow();
    await expect(
      validarConfiguracionVenta(trx, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'botella',
          acompanamiento_botella: { presentacion_id: 'sprite', unidades: 4 }
        }
      ])
    ).resolves.toBeUndefined();
  });
});
