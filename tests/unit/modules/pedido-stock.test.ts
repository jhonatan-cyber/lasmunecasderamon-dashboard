import { describe, expect, it, vi } from 'vitest';
import { validarStockPedido } from '@/modules/inventario/bar/consumoRepositorio';
import type { TransactionQuery } from '@/lib/database/db';
function database(
  stock: Record<string, Array<{ id: string; ml_restante: number | null }>>,
  mixerMl?: number
) {
  return vi.fn(async (sql: string, values: string[] = []) => {
    if (!sql.trim().startsWith('SELECT')) throw new Error('El pedido no debe modificar inventario');
    if (sql.includes('FROM configuraciones')) return [];
    // obtenerStockBar usa GROUP BY presentacion_id para acompañamientos (JOIN inventario_presentaciones)
    if (sql.includes('GROUP BY presentacion_id')) {
      return values.map(pId => {
        const units = stock[pId] || [];
        const stockBar = units.filter(u => u.ml_restante == null || (u.ml_restante ?? 0) > 0).length;
        // ml_abierta: suma ml_restante > 0 + ml_botella para botellas completas (null)
        const mlAbierta = units.reduce((s, u) => {
          if (u.ml_restante == null) return s + 750; // ml_botella default
          return s + (u.ml_restante > 0 ? u.ml_restante : 0);
        }, 0);
        return { presentacion_id: pId, stock_bar: stockBar, ml_abierta: mlAbierta };
      });
    }
    if (sql.includes('FROM inventario_unidades')) return stock[values[0]] || [];
    // La lectura individual (`WHERE p.id = ?`) y la validación por lote
    // (`ORDER BY id FOR UPDATE`) se distinguen por su forma.
    if (sql.includes('WHERE p.id = ?'))
      return [
        { id: values[0], nombre: '750 ml', ml_botella: 750, ml_shot: 50, ml_shot_anfitriona: 25 }
      ];
    if (sql.includes('ORDER BY id FOR UPDATE'))
      return values.map(id => ({
        id,
        nombre: '750 ml',
        ml_botella: 750,
        opciones_venta: id === 'soda'
          ? [{ tipo: 'botella', corto_anfitriona_habilitado: true, colacion_habilitada: true, cover_habilitado: true }]
          : mixerMl
            ? [{ tipo: 'shot', precio: 10000, ml_acompanamiento_anfitriona: mixerMl }]
            : undefined
      }));
    return [];
  }) as unknown as TransactionQuery;
}
const bottle = { presentacion_id: 'licor', cantidad: 1, tipo_venta: 'botella' };
describe('Stock al enviar pedido, sin consumir ni reservar', () => {
  it('acumula lineas repetidas y rechaza cantidades que individualmente caben', async () => {
    await expect(
      validarStockPedido(database({ licor: [{ id: 'a', ml_restante: null }] }), [bottle, bottle])
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BAR_STOCK' });
  });
  it('no cuenta una botella abierta como botella completa', async () => {
    await expect(
      validarStockPedido(database({ licor: [{ id: 'a', ml_restante: 700 }] }), [bottle])
    ).rejects.toThrow('botellas');
  });
  it('acumula ml de corto cliente y anfitriona con el tamano de cada formato', async () => {
    const trx = database({ licor: [{ id: 'a', ml_restante: 100 }] });
    await expect(
      validarStockPedido(trx, [
        { ...bottle, tipo_venta: 'shot', cantidad: 1 },
        { ...bottle, tipo_venta: 'shot', shot_anfitriona: true, cantidad: 2 }
      ])
    ).resolves.toBeUndefined();
    await expect(
      validarStockPedido(trx, [
        { ...bottle, tipo_venta: 'shot', cantidad: 1 },
        { ...bottle, tipo_venta: 'shot', shot_anfitriona: true, cantidad: 3 }
      ])
    ).rejects.toThrow('stock');
  });
  it('una botella usada para cortos no puede venderse ademas completa', async () => {
    await expect(
      validarStockPedido(database({ licor: [{ id: 'a', ml_restante: null }] }), [
        bottle,
        { ...bottle, tipo_venta: 'shot' }
      ])
    ).rejects.toThrow('stock');
  });
  it('comprueba bebida de botella y bebida de corto por ml', async () => {
    await expect(
      validarStockPedido(database({ licor: [{ id: 'a', ml_restante: null }] }), [
        { ...bottle, acompanamiento_botella: { presentacion_id: 'soda', unidades: 2 } }
      ])
    ).rejects.toThrow('acompañamiento');
    await expect(
      validarStockPedido(
        database(
          { licor: [{ id: 'a', ml_restante: null }], soda: [{ id: 'b', ml_restante: 20 }] },
          30
        ),
        [
          {
            ...bottle,
            tipo_venta: 'shot',
            shot_anfitriona: true,
            acompanamiento_corto: { presentacion_id: 'soda', ml_por_corto: 30 }
          }
        ]
      )
    ).rejects.toThrow('bebida abierta');
  });
  it('un pedido valido ejecuta solo lecturas, conservando cantidades y ml', async () => {
    const trx = database({
      licor: [{ id: 'a', ml_restante: null }],
      soda: [
        { id: 'b', ml_restante: null },
        { id: 'c', ml_restante: null }
      ]
    });
    await expect(
      validarStockPedido(trx, [
        { ...bottle, acompanamiento_botella: { presentacion_id: 'soda', unidades: 2 } }
      ])
    ).resolves.toBeUndefined();
    expect(vi.mocked(trx).mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });
});
