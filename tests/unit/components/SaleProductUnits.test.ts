import { expect, it, vi } from 'vitest';
import {
  buildSaleProductItem,
  type SaleProductItemContext
} from '@/components/sales/product-modal/saleProductItems';
it('envia cada corto con su propia bebida, anfitriona y comision', async () => {
  const add = vi.fn();
  const context: SaleProductItemContext = {
    shotMl: 50,
    cantidades: {},
    cantidadesPorTipo: { 'ron:shot_anfitriona': 2 },
    champagneHostessSelections: {},
    otherProductHostessSelections: {
      'ron:shot_anfitriona': ['lola'],
      'ron:shot_anfitriona:unit:1': ['sami']
    },
    hostessSearchValues: {},
    productosEnCarrito: [],
    availableHostesses: [],
    mixers: {
      'ron:shot_anfitriona': { presentacion_id: 'coca', ml_por_corto: 150 },
      'ron:shot_anfitriona:unit:1': { presentacion_id: 'sprite', ml_por_corto: 150 }
    },
    bar: [
      { id: 'coca', stock_bar: 2 },
      { id: 'sprite', stock_bar: 2 }
    ],
    onSaleTypeChange: vi.fn(),
    onCantidadChange: vi.fn(),
    onChampagneHostessChange: vi.fn(),
    onOtherProductHostessChange: vi.fn(),
    onHostessSearchChange: vi.fn(),
    onAgregarProducto: add
  };
  const product = {
    id: 'ron',
    ml_shot_anfitriona: 20,
    stock_bar: 2,
    opciones_venta: [
      {
        tipo: 'shot',
        precio: 5000,
        precio_anfitriona: 10000,
        comision: 2000,
        ml_acompanamiento_anfitriona: 150
      }
    ]
  };
  const item = buildSaleProductItem(product, context);
  expect(item.mixers).toHaveLength(2);
  expect(item.agregarDisabled).toBe(false);
  await item.onAgregar();
  expect(add).toHaveBeenCalledTimes(2);
  expect(add).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      cantidad: 1,
      precio: 10000,
      selectedHostesses: ['lola'],
      acompanamiento_corto: expect.objectContaining({ presentacion_id: 'coca', ml_por_corto: 150 })
    })
  );
  expect(add).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      cantidad: 1,
      selectedHostesses: ['sami'],
      acompanamiento_corto: expect.objectContaining({
        presentacion_id: 'sprite',
        ml_por_corto: 150
      })
    })
  );
  delete context.mixers!['ron:shot_anfitriona:unit:1'];
  expect(buildSaleProductItem(product, context).agregarDisabled).toBe(true);
});
