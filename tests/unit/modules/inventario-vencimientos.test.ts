import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Baja por vencimiento: las unidades vencidas salen del inventario y quedan
 * registradas en el historial como merma. Las consultas se interceptan para
 * comprobar el SQL que se manda y los parámetros que se calculan.
 */

const consultas = vi.hoisted(() => [] as { sql: string; params: unknown[] }[]);

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    return [];
  }),
  withTransaction: vi.fn(),
  generateUUID: () => 'movimiento-1'
}));

import { NotFoundError } from '@/lib/errors/errors';
import { query } from '@/lib/database/db';
import { darDeBajaLoteVencido, listarLotesVencidos } from '@/modules/inventario/mermas/repositorio';

/**
 * Responde la próxima consulta con `filas` dejando registro de lo que se
 * pidió, para poder comprobar el SQL y sus parámetros.
 */
function respondeCon(filas: any[]) {
  vi.mocked(query).mockImplementationOnce(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    return filas as any;
  });
}

/** Dos botellas vencidas: una abierta en el bar y una cerrada en bodega. */
const VENCIDAS = [
  {
    id: 'u-1',
    producto_id: 'prod-1',
    producto: 'Ron',
    presentacion: '750 ml',
    ml_restante: 120,
    fecha_vencimiento: '2026-10-01'
  },
  {
    id: 'u-2',
    producto_id: 'prod-1',
    producto: 'Ron',
    presentacion: '750 ml',
    ml_restante: null,
    fecha_vencimiento: '2026-10-01'
  }
];

/** Transacción que devuelve las filas vencidas sólo en la consulta de las unidades. */
function transaccionMock() {
  return vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    if (sql.includes('FOR UPDATE OF u')) return VENCIDAS;
    return [];
  });
}

beforeEach(() => {
  consultas.length = 0;
});

describe('listarLotesVencidos', () => {
  it('mapea las presentaciones con stock vencido', async () => {
    respondeCon([
      {
        presentacion_id: 'pres-1',
        producto_id: 'prod-1',
        producto: 'Ron',
        presentacion: '750 ml',
        fecha_vencimiento: '2026-10-01',
        unidades_vencidas: 4,
        unidades_bodega: 3,
        unidades_bar: 1,
        ml_abiertos: 120
      }
    ]);

    const lotes = await listarLotesVencidos();

    expect(lotes).toEqual([
      {
        presentacion_id: 'pres-1',
        producto_id: 'prod-1',
        producto: 'Ron',
        presentacion: '750 ml',
        fecha_vencimiento: '2026-10-01',
        unidades_vencidas: 4,
        unidades_bodega: 3,
        unidades_bar: 1,
        ml_abiertos: 120
      }
    ]);
  });

  it('filtra por las unidades activas con vencimiento pasado', async () => {
    respondeCon([]);

    await listarLotesVencidos();

    const consulta = consultas.at(-1)!;
    expect(consulta.sql).toContain("u.estado = 'almacen'");
    // El vencimiento que aplica es el del lote y, si no hay, el de la presentación.
    expect(consulta.sql).toContain('COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < ?');
  });
});

describe('darDeBajaLoteVencido', () => {
  it('inactiva las unidades vencidas y registra la merma', async () => {
    const trx = transaccionMock();

    const resultado = await darDeBajaLoteVencido(
      trx as any,
      'pres-1',
      'usuario-1',
      'Lote Old 2026'
    );

    expect(resultado).toMatchObject({
      presentacion_id: 'pres-1',
      producto_id: 'prod-1',
      unidades: 2,
      // Sólo cuenta el ml que estaba abierto: una botella cerrada sale entera.
      ml: 120,
      fecha_vencimiento: '2026-10-01'
    });

    const actualizacion = consultas.find(c => c.sql.includes("SET estado = 'inactivo'"));
    expect(actualizacion).toBeDefined();
    expect(actualizacion!.params).toEqual(['u-1', 'u-2']);

    const movimiento = consultas.find(c => c.sql.includes('INSERT INTO inventario_movimientos'));
    expect(movimiento).toBeDefined();
    expect(movimiento!.sql).toContain("'merma'");
    expect(movimiento!.params).toEqual([
      'movimiento-1',
      'prod-1',
      'pres-1',
      2,
      'usuario-1',
      120,
      'Lote Old 2026',
      expect.any(String)
    ]);

    // Cada botella dada de baja queda anotada en el historial del movimiento.
    const unidades = consultas.find(c =>
      c.sql.includes('INSERT INTO inventario_movimiento_unidades')
    );
    expect(unidades).toBeDefined();
    expect(unidades!.params).toEqual(['movimiento-1', 'u-1', 120, 'movimiento-1', 'u-2', 0]);
  });

  it('no toca el stock que no está vencido', async () => {
    const trx = transaccionMock();

    await darDeBajaLoteVencido(trx as any, 'pres-1', 'usuario-1');

    const seleccion = consultas.find(c => c.sql.includes('FOR UPDATE OF u'))!;
    // La selección se limita a lo vencido y bloquea esas filas.
    expect(seleccion.sql).toContain("u.estado = 'almacen'");
    expect(seleccion.sql).toContain('COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < ?');
  });

  it('avisa cuando la presentación ya no tiene stock vencido', async () => {
    const trx = vi.fn(async (sql: string, params: unknown[] = []) => {
      consultas.push({ sql, params });
      return [];
    });

    await expect(darDeBajaLoteVencido(trx as any, 'pres-1', 'usuario-1')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
