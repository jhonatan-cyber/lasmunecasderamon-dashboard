import { describe, expect, it } from 'vitest';
import { agruparProductosVenta } from '@/lib/sales/ventaDetalle';
const base = {
  venta_id: 'venta',
  producto_id: 'producto',
  presentacion_id: 'pres-1',
  precio: 160000,
  comision: 20000,
  cantidad: 1,
  sub_total: 160000
};
describe('detalle comercial de la venta', () => {
  it('muestra una botella y suma las comisiones de todas las anfitrionas', () => {
    const detalles = [
      base,
      { ...base, cantidad: 0, sub_total: 0 },
      { ...base, cantidad: 0, sub_total: 0 }
    ];
    expect(agruparProductosVenta(detalles)).toEqual([{ ...base, comision: 60000 }]);
    expect(detalles[0].comision).toBe(20000);
  });
  it('conserva por separado presentaciones, precios y shots', () => {
    expect(
      agruparProductosVenta([
        base,
        { ...base, presentacion_id: 'pres-2' },
        { ...base, precio: 170000 },
        { ...base, tipo_venta: 'shot' },
        { ...base, tipo_venta: 'shot', shot_anfitriona: true }
      ])
    ).toHaveLength(5);
  });
  it('suma cantidades e importes sin eliminar productos gratuitos', () => {
    expect(agruparProductosVenta([base, base])[0]).toMatchObject({
      cantidad: 2,
      sub_total: 320000,
      comision: 40000
    });
    expect(agruparProductosVenta([{ ...base, precio: 0, sub_total: 0 }])).toHaveLength(1);
  });
});
