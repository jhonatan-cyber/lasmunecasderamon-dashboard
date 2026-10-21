import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El Acompañamiento que se entrega por unidades completas (no por ml) sigue
 * sacando bebida del bar: el movimiento tiene que registrar esos ml, o el
 * stock sale y no aparece en ningún resumen.
 */

const trx = vi.hoisted(() => vi.fn());
const movimientos = vi.hoisted(() => [] as { sql: string; params: unknown[] }[]);
const unidadesDeMovimiento = vi.hoisted(() => [] as { sql: string; params: unknown[] }[]);

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(async () => []),
  withTransaction: vi.fn(),
  generateUUID: () => 'mov-1'
}));

vi.mock('@/lib/transaccion/infraestructura', () => ({
  resolverTransaccion: () => trx
}));

vi.mock('@/modules/inventario/unidades/repositorio', () => ({
  sincronizarStockTotal: vi.fn(async () => undefined)
}));

import { consumirColacion } from '@/modules/inventario/bar/consumoRepositorio';

const contexto = { id: 'unidad-1' };

beforeEach(() => {
  movimientos.length = 0;
  unidadesDeMovimiento.length = 0;
  trx.mockReset();
  trx.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM inventario_presentaciones p')) {
      return [
        {
          id: 'p-mixer',
          producto_id: 'prod-mixer',
          nombre: 'Mixer 750 ml',
          ml_botella: 750
        }
      ];
    }
    if (sql.includes('FROM inventario_unidades')) {
      // Dos botellas cerradas en el bar (ml_restante 0 = sin abrir).
      return [
        { id: 'u1', ml_restante: 0 },
        { id: 'u2', ml_restante: 0 }
      ];
    }
    if (sql.includes('INSERT INTO inventario_movimientos')) {
      movimientos.push({ sql, params });
      return undefined;
    }
    if (sql.includes('INSERT INTO inventario_movimiento_unidades')) {
      unidadesDeMovimiento.push({ sql, params });
      return undefined;
    }
    return [];
  });
});

describe('consumirColacion con Acompañamiento por unidades', () => {
  it('registra en el movimiento los ml que salen del bar', async () => {
    await consumirColacion(
      [{ presentacion_id: 'p-mixer', unidades: 2 }],
      'usuario-1',
      '2025-01-01 12:00:00',
      contexto
    );

    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].sql).toContain("'colacion'");
    // (id, producto_id, presentacion_id, cantidad, usuario_id, ml, fecha_crea)
    expect(movimientos[0].params[3]).toBe(2);
    expect(movimientos[0].params[5]).toBe(1500);
  });

  it('deja los ml consumidos de cada unidad en el detalle del movimiento', async () => {
    await consumirColacion(
      [{ presentacion_id: 'p-mixer', unidades: 2 }],
      'usuario-1',
      '2025-01-01 12:00:00',
      contexto
    );

    expect(unidadesDeMovimiento).toHaveLength(1);
    // (movimiento_id, unidad_id, ml_consumido) por unidad.
    expect(unidadesDeMovimiento[0].params).toEqual(['mov-1', 'u1', 750, 'mov-1', 'u2', 750]);
  });

  it('no registra ml cuando el Acompañamiento se entrega por ml', async () => {
    await consumirColacion(
      [{ presentacion_id: 'p-mixer', ml: 150 }],
      'usuario-1',
      '2025-01-01 12:00:00',
      contexto
    );

    expect(movimientos).toHaveLength(1);
    // Se sacan 150 ml de la botella abierta: el movimiento lleva esos ml.
    expect(movimientos[0].params[5]).toBe(150);
  });
});
