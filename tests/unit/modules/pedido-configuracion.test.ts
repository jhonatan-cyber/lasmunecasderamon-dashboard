import { describe, expect, it, vi } from 'vitest';
import { validarConfiguracionPedido } from '@/modules/inventario/bar/validarPedido';
import { OrderCreateSchema } from '@/lib/business/schemas/order';
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
  config: {
    categoria?: string;
    max?: number | null;
    opciones?: unknown;
    estado?: number;
    tiers?: Array<{ producto_id: string; anfitrionas: number; precio: number; comision: number }>;
  } = {}
) {
  return vi.fn(async (sql: string) => {
    if (sql.includes('FROM inventario_unidades')) return [{ id: 'unit', ml_restante: null }];
    // La lectura individual de una presentación (`WHERE p.id = ?`) y la
    // validación por lote (`ORDER BY id FOR UPDATE`) se distinguen por su forma.
    if (sql.includes('WHERE p.id = ?'))
      return [{ id: 'pres', producto_id: 'prod', nombre: '750 ml', ml_botella: 750 }];
    if (sql.includes('ORDER BY id FOR UPDATE'))
      return [
        {
          id: 'pres',
          producto_id: 'prod',
          precio_venta: 60000,
          comision: 0,
          opciones_venta: config.opciones ?? options
        }
      ];
    if (sql.includes('FROM producto_champagne_tiers')) return config.tiers ?? [];
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
  it('valida la botella sin anfitriona contra su precio alternativo', async () => {
    const config = trx({
      opciones: [
        {
          tipo: 'botella',
          precio: 60000,
          comision: 12000,
          precio_sin_anfitriona: 45000
        }
      ]
    });
    const request = OrderCreateSchema.parse({
      codigo: 'pedido-test',
      meseroId: 'mesero',
      subtotal: 45000,
      total: 45000,
      metodoPago: 'efectivo',
      detalles: [
        {
          ...bottle,
          precio: 45000,
          subtotal: 45000,
          botella_anfitriona: false
        }
      ]
    });
    expect(request.detalles[0].botella_anfitriona).toBe(false);
    await expect(validarConfiguracionPedido(config, request.detalles)).resolves.toBeUndefined();
    await expect(
      validarConfiguracionPedido(config, [{ ...request.detalles[0], precio: 1, subtotal: 1 }])
    ).rejects.toThrow('precio o la comision no coincide');
  });
  it('rechaza la botella sin anfitriona si la venta está deshabilitada aunque tenga precio guardado', async () => {
    const config = trx({
      opciones: [
        {
          tipo: 'botella',
          precio: 0,
          comision: 0,
          precio_sin_anfitriona: 2900,
          en_venta: false
        }
      ]
    });
    await expect(
      validarConfiguracionPedido(config, [
        {
          ...bottle,
          precio: 2900,
          subtotal: 2900,
          botella_anfitriona: false
        }
      ])
    ).rejects.toThrow('precio o la comision no coincide');
  });
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

it('bloquea la champana sin tramos ni maximo explicito', async () => {
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
  await expect(validarConfiguracionPedido(trx(config), [d])).rejects.toThrow('tabla de precios');
});

it('usa los tramos guardados como limite de champana', async () => {
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
    opciones: [{ tipo: 'botella', precio: 120000, comision: 40000 }],
    tiers: [
      { producto_id: 'prod', anfitrionas: 1, precio: 120000, comision: 40000 },
      { producto_id: 'prod', anfitrionas: 2, precio: 120000, comision: 40000 }
    ]
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
