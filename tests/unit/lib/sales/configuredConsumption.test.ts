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
const spriteAcompanamientoAnfitriona = {
  id: 'sprite',
  estado: 1,
  opciones_venta: [
    {
      tipo: 'botella',
      corto_anfitriona_habilitado: true,
      colacion_habilitada: false,
      cover_habilitado: true
    }
  ]
};
const stockBarRow = { presentacion_id: 'sprite', stock_bar: 10, ml_abierta: 5000 };
const trx = vi.fn(async (_sql: string, params?: unknown[]) => {
  if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
    return params && params.length > 0 ? [stockBarRow] : [];
  }
  return [{ id: 'vodka', opciones_venta: config }, spriteAcompanamientoAnfitriona];
}) as unknown as TransactionQuery;
describe('server configured consumption', () => {
  it('rechaza corto cliente cuando solo existe precio de anfitriona', async () => {
    const onlyHostess = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [] : [];
      }
      return [
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
      ];
    }) as unknown as TransactionQuery;
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
    const optionalTrx = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [stockBarRow] : [];
      }
      return [
        {
          id: 'vodka',
          opciones_venta: [
            { tipo: 'shot', precio: 5000, comision: 0, ml_acompanamiento_anfitriona: 0 }
          ]
        },
        spriteAcompanamientoAnfitriona
      ];
    }) as unknown as TransactionQuery;
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

  it('rejects hostess short if accompaniment is disabled for that use', async () => {
    const disabledForHostessShort = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [stockBarRow] : [];
      }
      return [
        { id: 'vodka', opciones_venta: config },
        {
          id: 'sprite',
          estado: 1,
          opciones_venta: [
            { tipo: 'botella', corto_anfitriona_habilitado: false, colacion_habilitada: true }
          ]
        }
      ];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(disabledForHostessShort, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
        }
      ])
    ).rejects.toThrow('no está habilitada para corto con anfitriona');
  });

  it('accepts hostess short when its accompaniment is enabled, regardless of colacion_habilitada', async () => {
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

  it('rejects client short if accompaniment lacks cover_habilitado', async () => {
    const withoutCover = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [stockBarRow] : [];
      }
      return [
        { id: 'vodka', opciones_venta: config },
        {
          id: 'sprite',
          estado: 1,
          opciones_venta: [{ tipo: 'botella', colacion_habilitada: true, cover_habilitado: false }]
        }
      ];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(withoutCover, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 }
        }
      ])
    ).rejects.toThrow('no está habilitada para corto al cliente');
  });

  it('rejects client short if accompaniment product is inactive', async () => {
    const inactiveMixer = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [stockBarRow] : [];
      }
      return [
        { id: 'vodka', opciones_venta: config },
        {
          id: 'sprite',
          estado: 0,
          opciones_venta: [{ tipo: 'botella', cover_habilitado: true }]
        }
      ];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(inactiveMixer, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 }
        }
      ])
    ).rejects.toThrow('no está disponible');
  });

  it('rejects bottle if accompaniment product is inactive', async () => {
    const inactiveBottleMixer = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [stockBarRow] : [];
      }
      return [
        { id: 'vodka', opciones_venta: config },
        {
          id: 'sprite',
          estado: 0,
          opciones_venta: [{ tipo: 'botella' }]
        }
      ];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(inactiveBottleMixer, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'botella',
          acompanamiento_botella: { presentacion_id: 'sprite', unidades: 4 }
        }
      ])
    ).rejects.toThrow('no está disponible');
  });

  it('rejects hostess short if accompaniment has no stock in bar', async () => {
    const noStock = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0 ? [] : [];
      }
      return [{ id: 'vodka', opciones_venta: config }, spriteAcompanamientoAnfitriona];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(noStock, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          shot_anfitriona: true,
          acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
        }
      ])
    ).rejects.toThrow('No hay stock disponible');
  });

  it('rejects hostess short if accompaniment has insufficient ml_abierta', async () => {
    const lowMl = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0
          ? [{ presentacion_id: 'sprite', stock_bar: 1, ml_abierta: 50 }]
          : [];
      }
      return [{ id: 'vodka', opciones_venta: config }, spriteAcompanamientoAnfitriona];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(lowMl, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          cantidad: 2,
          shot_anfitriona: true,
          acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
        }
      ])
    ).rejects.toThrow('No hay suficiente bebida abierta');
  });

  it('rejects client short if accompaniment has insufficient units', async () => {
    const lowStock = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0
          ? [{ presentacion_id: 'sprite', stock_bar: 1, ml_abierta: 0 }]
          : [];
      }
      return [{ id: 'vodka', opciones_venta: config }, spriteAcompanamientoAnfitriona];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(lowStock, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'shot',
          cantidad: 2,
          acompanamiento_corto: { presentacion_id: 'sprite', unidades: 1 }
        }
      ])
    ).rejects.toThrow('No hay suficientes unidades');
  });

  it('rejects bottle if accompaniment has insufficient stock', async () => {
    const lowBottleStock = vi.fn(async (_sql: string, params?: unknown[]) => {
      if (typeof _sql === 'string' && _sql.includes('inventario_unidades')) {
        return params && params.length > 0
          ? [{ presentacion_id: 'sprite', stock_bar: 2, ml_abierta: 0 }]
          : [];
      }
      return [{ id: 'vodka', opciones_venta: config }, spriteAcompanamientoAnfitriona];
    }) as unknown as TransactionQuery;
    await expect(
      validarConfiguracionVenta(lowBottleStock, [
        {
          presentacion_id: 'vodka',
          tipo_venta: 'botella',
          acompanamiento_botella: { presentacion_id: 'sprite', unidades: 4 }
        }
      ])
    ).rejects.toThrow('No hay stock suficiente');
  });
});
