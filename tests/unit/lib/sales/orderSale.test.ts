import { describe, expect, it } from 'vitest';
import { orderLineToSaleDetail } from '@/lib/sales/orderSale';
import { OrderCreateSchema, SaleCreateSchema } from '@/lib/business/schemas';
import { computeOrderHostessLimit } from '@/components/orders/productModalRules';

const base = {
  producto_id: 'whisky',
  precio: 20000,
  cantidad: 2,
  comision: 6000,
  genera_comision: 1,
  anfitrionas_asignadas_ids: 'ana,bea',
  hostess_id: 'ana'
};

describe('Pedido listo para vender', () => {
  it.each([
    {
      tipo_venta: 'botella' as const,
      acompanamiento_botella: { presentacion_id: 'sprite', unidades: 4 }
    },
    {
      tipo_venta: 'shot' as const,
      shot_anfitriona: true,
      acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
    },
    {
      tipo_venta: 'shot' as const,
      shot_anfitriona: false,
      acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 }
    }
  ])('mantiene el formato y la bebida guardados ($tipo_venta)', config => {
    const detail = orderLineToSaleDetail({
      ...base,
      configuracion_venta: JSON.stringify({ presentacion_id: 'whisky-750', ...config })
    });
    const sale = SaleCreateSchema.parse({ total: 40000, detalles: [detail] });
    expect(sale.detalles[0]).toMatchObject({
      ...config,
      ...(config.tipo_venta === 'botella'
        ? { acompanamiento_botella: [{ presentacion_id: 'sprite', unidades: 4 }] }
        : {}),
      presentacion_id: 'whisky-750',
      cantidad: 2,
      sub_total: 40000,
      comision: config.tipo_venta === 'shot' && !config.shot_anfitriona ? 0 : 6000
    });
    expect(sale.detalles[0].hostesses).toEqual(
      config.tipo_venta === 'shot' && !config.shot_anfitriona ? [] : ['ana', 'bea']
    );
  });

  it('respeta las ventas antiguas sin presentación y desactiva comisiones de cliente', () => {
    expect(orderLineToSaleDetail({ ...base, genera_comision: 0 })).toMatchObject({
      comision: 0,
      hostesses: [],
      hostess_id: null,
      cantidad: 2
    });
  });

  it('permite dos anfitrionas para dos cortos y rechaza tres', () => {
    const input = {
      codigo: 'PEDIDO',
      meseroId: 'garzon',
      metodoPago: 'efectivo',
      subtotal: 40000,
      total: 40000,
      detalles: [
        {
          productoId: 'whisky',
          presentacion_id: 'whisky-750',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          precio: 20000,
          cantidad: 2,
          subtotal: 40000,
          comision: 6000,
          selectedHostesses: ['ana', 'bea']
        }
      ]
    };
    expect(OrderCreateSchema.safeParse(input).success).toBe(true);
    expect(
      OrderCreateSchema.safeParse({
        ...input,
        detalles: [{ ...input.detalles[0], selectedHostesses: ['ana', 'bea', 'cami'] }]
      }).success
    ).toBe(false);
  });

  it('cuenta anfitrionas por unidad para cortos, incluso de champaña', () => {
    expect(
      computeOrderHostessLimit([
        {
          categoria: 'Champaña',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          cantidad: 2,
          genera_comision: 1,
          comision: 6000,
          precio: 20000
        }
      ])
    ).toMatchObject({
      maxAnfitrionas: 2,
      hasChampagneProducts: false
    });
    expect(
      computeOrderHostessLimit([
        {
          categoria: 'Champaña',
          tipo_venta: 'shot',
          shot_anfitriona: false,
          cantidad: 2,
          genera_comision: 1
        }
      ]).maxAnfitrionas
    ).toBe(0);
  });
});

it('conserva el recargo de acompañamiento en el subtotal del pedido convertido en venta', () => {
  const detail = orderLineToSaleDetail({
    ...base,
    configuracion_venta: JSON.stringify({
      presentacion_id: 'whisky-750',
      tipo_venta: 'botella',
      acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 3, precio: 5000 }],
      recargo_acompanamiento: 6000
    })
  });
  expect(detail).toMatchObject({
    recargo_acompanamiento: 6000,
    precio: 20000,
    cantidad: 2,
    sub_total: 52000
  });
  expect(SaleCreateSchema.safeParse({ total: 52000, detalles: [detail] }).success).toBe(true);
});

it('conserva el reparto de botella de champana entre varias anfitrionas', () => {
  expect(
    orderLineToSaleDetail({ ...base, categoria: 'Champana', tipo_venta: 'botella', cantidad: 1 })
  ).toMatchObject({ isChampagne: true, hostesses: ['ana', 'bea'], cantidad: 1, comision: 6000 });
  expect(
    orderLineToSaleDetail({
      ...base,
      categoria: 'Champana',
      tipo_venta: 'shot',
      shot_anfitriona: true
    })
  ).toMatchObject({ isChampagne: false });
});
