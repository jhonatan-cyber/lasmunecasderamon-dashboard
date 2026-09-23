import { describe, it, expect } from 'vitest';
import { mapForSaleToCartItem } from '@/lib/sales/forSaleMapper';

const base = {
  presentacion_id: 'pres-1',
  presentacion_nombre: '750 ml',
  codigo_barras: '2900000000018',
  foto: null,
  precio_venta: 15000,
  comision: 2000,
  stock_bar: 5,
  producto_id: 'prod-1',
  producto_codigo: 'ABC123',
  producto_nombre: 'Paceña',
  categoria_id: 'cat-1',
  categoria_nombre: 'Cerveza'
};

describe('mapForSaleToCartItem', () => {
  it('usa la presentación como id y conserva el producto para la FK', () => {
    const item = mapForSaleToCartItem(base);
    expect(item.id).toBe('pres-1');
    expect(item.producto_id).toBe('prod-1');
    expect(item.presentacion_id).toBe('pres-1');
  });

  it('mapea precio/comisión de venta y ambas convenciones de claves', () => {
    const item = mapForSaleToCartItem(base);
    expect(item.precio).toBe(15000);
    expect(item.price).toBe(15000);
    expect(item.comision).toBe(2000);
    expect(item.commission).toBe(2000);
    expect(item.codigo).toBe('2900000000018');
    expect(item.nombre).toBe('Paceña 750 ml');
    expect(item.categoria).toBe('Cerveza');
    expect(item.stock_bar).toBe(5);
  });

  it('anula la comisión en venta simple (precio bajo el umbral)', () => {
    const item = mapForSaleToCartItem({ ...base, precio_venta: 5000, comision: 500 });
    expect(item.precio).toBe(5000);
    expect(item.comision).toBe(0);
    expect(item.commission).toBe(0);
  });

  it('usa el código del producto si no hay barra y foto por defecto', () => {
    const item = mapForSaleToCartItem({ ...base, codigo_barras: null, foto: null });
    expect(item.codigo).toBe('ABC123');
    expect(item.foto).toBe('default.png');
  });
});
