import { describe, expect, it, vi } from 'vitest';
import { validarConfiguracionPedido } from '@/modules/inventario/bar/validarPedido';
import { validarPreciosConfigurados } from '@/modules/inventario/bar/validarConfiguracionVenta';
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
  it.each([true, undefined])(
    'rechaza CON deshabilitada incluso con tiers y flag request %s',
    async flag => {
      const config = trx({
        categoria: 'Champana',
        max: 1,
        opciones: [
          {
            tipo: 'botella',
            precio: 60000,
            comision: 10000,
            vender_con_anfitriona: false,
            precio_sin_anfitriona: 45000
          }
        ],
        tiers: [{ producto_id: 'prod', anfitrionas: 1, precio: 70000, comision: 15000 }]
      });
      await expect(
        validarConfiguracionPedido(config, [
          {
            ...bottle,
            botella_anfitriona: flag,
            precio: 70000,
            subtotal: 70000,
            comision: 15000,
            generaComision: 1,
            selectedHostesses: ['ana']
          }
        ])
      ).rejects.toThrow('precio o la comision');
      expect(
        vi.mocked(config).mock.calls.some(([sql]) => sql.includes('FROM inventario_unidades'))
      ).toBe(false);
    }
  );
  it.each([0, -100])('rechaza CON con precio no positivo %s', async precio => {
    await expect(
      validarConfiguracionPedido(
        trx({
          opciones: [{ tipo: 'botella', precio, comision: 0 }]
        }),
        [{ ...bottle, precio, subtotal: precio }]
      )
    ).rejects.toThrow('precio o la comision');
  });
  it('rechaza un tier con precio cero en vez de vender gratis', async () => {
    await expect(
      validarConfiguracionPedido(
        trx({
          categoria: 'Champana',
          max: 1,
          tiers: [{ producto_id: 'prod', anfitrionas: 1, precio: 0, comision: 10000 }]
        }),
        [
          {
            ...bottle,
            precio: 0,
            subtotal: 0,
            comision: 10000,
            generaComision: 1,
            selectedHostesses: ['ana']
          }
        ]
      )
    ).rejects.toThrow('precio o la comision');
  });
  it('acepta champaña SIN-only sin tiers ni máximo de anfitrionas', async () => {
    const config = trx({
      categoria: 'Champana',
      max: null,
      opciones: [
        {
          tipo: 'botella',
          precio: 0,
          comision: 0,
          vender_con_anfitriona: false,
          precio_sin_anfitriona: 45000
        }
      ]
    });
    const detalle = { ...bottle, precio: 45000, subtotal: 45000, botella_anfitriona: false };
    await expect(validarConfiguracionPedido(config, [detalle])).resolves.toBeUndefined();
    await expect(
      validarConfiguracionPedido(config, [
        {
          ...detalle,
          selectedHostesses: ['ana']
        }
      ])
    ).rejects.toThrow('sin comision');
    await expect(
      validarConfiguracionPedido(config, [
        {
          ...detalle,
          comision: 1000
        }
      ])
    ).rejects.toThrow('precio o la comision');
  });
  it('valida precio unitario SIN de venta directa sin confundirlo con crédito/subtotal', async () => {
    const config = trx({
      categoria: 'Champana',
      max: null,
      opciones: [
        {
          tipo: 'botella',
          precio: 0,
          comision: 0,
          vender_con_anfitriona: false,
          precio_sin_anfitriona: 45000
        }
      ]
    });
    const detalle = {
      producto_id: 'prod',
      presentacion_id: 'pres',
      tipo_venta: 'botella',
      botella_anfitriona: false,
      precio: 45000,
      cantidad: 1,
      comision: 0,
      sub_total: 5000,
      isChampagne: false
    };
    await expect(validarPreciosConfigurados(config, [detalle])).resolves.toEqual([
      { isChampagne: true }
    ]);
    await expect(
      validarPreciosConfigurados(config, [{ ...detalle, precio: 5000 }])
    ).rejects.toThrow('precio o la comision');
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
it('acepta el pedido con recargo de acompañamiento sumado al subtotal', () => {
  const payload = {
    codigo: 'pedido-recargo',
    meseroId: 'mesero',
    subtotal: 66000,
    total: 66000,
    metodoPago: 'efectivo',
    detalles: [
      {
        ...bottle,
        acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 3, precio: 5000 }],
        recargo_acompanamiento: 6000,
        subtotal: 66000
      }
    ]
  };
  expect(OrderCreateSchema.safeParse(payload).success).toBe(true);
  expect(
    OrderCreateSchema.safeParse({
      ...payload,
      detalles: [{ ...payload.detalles[0], subtotal: 63000 }]
    }).success
  ).toBe(false);
});

it('rechaza un producto deshabilitado aunque queden unidades', async () => {
  await expect(validarConfiguracionPedido(trx({ estado: 0 }), [bottle])).rejects.toThrow(
    'no esta disponible'
  );
});

describe('Ventas directas: precios configurados sin exigir anfitrionas', () => {
  it('acepta un catálogo legado sin opciones de venta', async () => {
    const detalle = {
      producto_id: 'prod',
      presentacion_id: 'pres',
      tipo_venta: 'shot' as const,
      precio: 3000,
      cantidad: 2,
      comision: 0
    };
    await expect(
      validarPreciosConfigurados(trx({ opciones: [] }), [detalle], {
        exigirAnfitrionas: false,
        permitirSinConfiguracion: true
      })
    ).resolves.toEqual([{ isChampagne: false }]);
  });

  it('permite vender con comisión sin asignar anfitrionas', async () => {
    const config = trx({
      opciones: [{ tipo: 'botella', precio: 60000, comision: 40000 }]
    });
    const detalle = {
      producto_id: 'prod',
      presentacion_id: 'pres',
      tipo_venta: 'botella' as const,
      precio: 60000,
      cantidad: 1,
      comision: 40000
    };
    await expect(
      validarPreciosConfigurados(config, [detalle], { exigirAnfitrionas: false })
    ).resolves.toEqual([{ isChampagne: false }]);
    await expect(validarPreciosConfigurados(config, [detalle])).rejects.toThrow(
      'Selecciona anfitriona'
    );
  });

  it('sigue bloqueando la champaña sin configuración', async () => {
    const config = trx({ opciones: [], categoria: 'Champana', max: null });
    const detalle = {
      producto_id: 'prod',
      presentacion_id: 'pres',
      tipo_venta: 'botella' as const,
      precio: 120000,
      cantidad: 1,
      comision: 40000
    };
    await expect(
      validarPreciosConfigurados(config, [detalle], {
        exigirAnfitrionas: false,
        permitirSinConfiguracion: true
      })
    ).rejects.toThrow('champaña no tiene configurada');
  });
});

it('un corto anfitriona legado conserva el precio del formato', async () => {
  const config = trx({
    opciones: [{ tipo: 'shot', precio: 3000, comision: 0, ml_acompanamiento_anfitriona: 100 }]
  });
  const detalle = {
    producto_id: 'prod',
    presentacion_id: 'pres',
    tipo_venta: 'shot' as const,
    shot_anfitriona: true,
    precio: 3000,
    cantidad: 1,
    comision: 0,
    acompanamiento_corto: { presentacion_id: 'soda', ml_por_corto: 100 }
  };
  await expect(
    validarPreciosConfigurados(config, [detalle], {
      exigirAnfitrionas: false,
      permitirSinConfiguracion: true
    })
  ).resolves.toEqual([{ isChampagne: false }]);
});
