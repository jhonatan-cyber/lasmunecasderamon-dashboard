import { expect, it, vi } from 'vitest';
import {
  buildSaleProductItem,
  type SaleProductItemContext
} from '@/components/sales/product-modal/saleProductItems';
it.each([0, 2000])(
  'envia cada corto con su propia bebida y anfitriona (comision %s)',
  async comision => {
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
          comision,
          ml_acompanamiento_anfitriona: 150
        }
      ]
    };
    const item = buildSaleProductItem(product, context);
    expect(item.mixers).toHaveLength(2);
    expect(item.muestraAnfitriona).toBe(comision > 0);
    expect(item.hostessFormats).toHaveLength(comision > 0 ? 2 : 0);
    expect(item.agregarDisabled).toBe(false);
    await item.onAgregar();
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        cantidad: 1,
        precio: 10000,
        selectedHostesses: comision > 0 ? ['lola'] : [],
        acompanamiento_corto: expect.objectContaining({
          presentacion_id: 'coca',
          ml_por_corto: 150
        })
      })
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cantidad: 1,
        selectedHostesses: comision > 0 ? ['sami'] : [],
        acompanamiento_corto: expect.objectContaining({
          presentacion_id: 'sprite',
          ml_por_corto: 150
        })
      })
    );
    delete context.mixers!['ron:shot_anfitriona:unit:1'];
    expect(buildSaleProductItem(product, context).agregarDisabled).toBe(true);
  }
);

it('separa botella sin comisión y corto con comisión y descarta la selección previa de la botella', async () => {
  const add = vi.fn();
  const context: SaleProductItemContext = {
    shotMl: 50,
    cantidades: {},
    cantidadesPorTipo: { 'corona:botella': 1, 'corona:shot_anfitriona': 1 },
    champagneHostessSelections: {},
    otherProductHostessSelections: { corona: ['lola'], 'corona:shot_anfitriona': ['sami'] },
    hostessSearchValues: {},
    productosEnCarrito: [],
    availableHostesses: [],
    onSaleTypeChange: vi.fn(),
    onCantidadChange: vi.fn(),
    onChampagneHostessChange: vi.fn(),
    onOtherProductHostessChange: vi.fn(),
    onHostessSearchChange: vi.fn(),
    onAgregarProducto: add
  };
  const product = {
    id: 'corona',
    stock_bar: 7,
    ml_shot_anfitriona: 165,
    opciones_venta: [
      { tipo: 'botella', precio: 10000, comision: 0 },
      { tipo: 'shot', precio: 0, precio_anfitriona: 30000, comision: 10000 }
    ]
  };
  const item = buildSaleProductItem(product, context);
  expect(item.hostessFormats?.map(format => format.value)).toEqual(['shot_anfitriona']);
  await item.onAgregar();
  expect(add).toHaveBeenCalledWith(
    expect.objectContaining({ tipo_venta: 'botella', comision: 0, selectedHostesses: [] })
  );
  expect(add).toHaveBeenCalledWith(
    expect.objectContaining({ tipo_venta: 'shot', comision: 10000, selectedHostesses: ['sami'] })
  );
});
