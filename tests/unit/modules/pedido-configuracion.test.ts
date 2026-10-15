import { describe, expect, it, vi } from 'vitest';
import { validarConfiguracionPedido } from '@/modules/inventario/bar/validarPedido';
import type { TransactionQuery } from '@/lib/database/db';
const options = [
  { tipo: 'botella', precio: 60000, comision: 0 },
  {
    tipo: 'shot',
    precio: 10000,
    precios_anfitriona: [
      { precio: 20000, comision: 7000 },
      { precio: 30000, comision: 10000 }
    ]
  }
];
const bottle = {
  productoId: 'prod',
  presentacion_id: 'pres',
  tipo_venta: 'botella' as const,
  precio: 60000,
  cantidad: 1,
  subtotal: 60000,
  comision: 0,
  generaComision: 0,
  selectedHostesses: [] as string[]
};
function trx(
  config: { categoria?: string; max?: number | null; opciones?: unknown; estado?: number } = {}
) {
  return vi.fn(async (sql: string) => {
    if (sql.includes('FROM inventario_unidades')) return [{ id: 'unit', ml_restante: null }];
    if (sql.includes('FROM inventario_presentaciones p'))
      return [{ id: 'pres', producto_id: 'prod', nombre: '750 ml', ml_botella: 750 }];
    if (sql.includes('FROM inventario_presentaciones') && !sql.includes('FROM productos'))
      return [
        {
          id: 'pres',
          producto_id: 'prod',
          precio_venta: 60000,
          comision: 0,
          opciones_venta: config.opciones ?? options
        }
      ];
    if (sql.includes('FROM productos'))
      return [
        {
          id_producto: 'prod',
          estado: config.estado ?? 1,
          tiene_presentaciones: true,
          precio: 60000,
          comision: 0,
          max_anfitrionas: config.max === undefined ? 1 : config.max,
          categoria: config.categoria
        }
      ];
    return [];
  }) as unknown as TransactionQuery;
}
describe('Configuracion del pedido verificada en servidor', () => {
  it('acepta botella sin anfitriona cuando su comision es cero', async () =>
    await expect(validarConfiguracionPedido(trx(), [bottle])).resolves.toBeUndefined());
  it('no hereda la comision del corto en botella', async () =>
    await expect(
      validarConfiguracionPedido(trx(), [{ ...bottle, selectedHostesses: ['ana'] }])
    ).rejects.toThrow('sin comision'));
  it.each([
    { precio: 20000, comision: 7000 },
    { precio: 30000, comision: 10000 }
  ])('valida cada variante de corto anfitriona', async price => {
    const d = {
      ...bottle,
      ...price,
      tipo_venta: 'shot' as const,
      shot_anfitriona: true,
      generaComision: 1,
      selectedHostesses: ['ana']
    };
    await expect(validarConfiguracionPedido(trx(), [d])).resolves.toBeUndefined();
    await expect(
      validarConfiguracionPedido(trx(), [{ ...d, selectedHostesses: [] }])
    ).rejects.toThrow('Selecciona anfitriona');
    await expect(validarConfiguracionPedido(trx(), [{ ...d, comision: 0 }])).rejects.toThrow(
      'comision no coincide'
    );
  });
  it('rechaza precio manipulado y presentacion de otro producto', async () => {
    await expect(validarConfiguracionPedido(trx(), [{ ...bottle, precio: 1 }])).rejects.toThrow(
      'precio'
    );
    await expect(
      validarConfiguracionPedido(trx(), [{ ...bottle, presentacion_id: 'otra' }])
    ).rejects.toThrow('presentacion');
  });
});

it('permite el limite de champana por precio cuando no hay tiers ni maximo explicito', async () => {
  const d = {
    ...bottle,
    precio: 120000,
    subtotal: 120000,
    comision: 40000,
    generaComision: 1,
    selectedHostesses: ['ana', 'bea']
  };
  const config = {
    categoria: 'Champana',
    max: null,
    opciones: [{ tipo: 'botella', precio: 120000, comision: 40000 }]
  };
  await expect(validarConfiguracionPedido(trx(config), [d])).resolves.toBeUndefined();
  await expect(
    validarConfiguracionPedido(trx(config), [{ ...d, selectedHostesses: ['ana', 'bea', 'cami'] }])
  ).rejects.toThrow('maximo');
});

it('no permite omitir presentacion para evitar el control de stock', async () => {
  await expect(
    validarConfiguracionPedido(trx(), [{ ...bottle, presentacion_id: undefined }])
  ).rejects.toThrow('presentacion');
});
it('rechaza un producto deshabilitado aunque queden unidades', async () => {
  await expect(validarConfiguracionPedido(trx({ estado: 0 }), [bottle])).rejects.toThrow(
    'no esta disponible'
  );
});
