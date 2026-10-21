import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Historial del bar paginado: el filtro de fechas, tipo y texto va al SQL con
 * parámetros y la página se convierte en `LIMIT/OFFSET`, con el total del mismo
 * filtro para saber cuántas páginas hay.
 */

const consultas = vi.hoisted(() => [] as { sql: string; params: unknown[] }[]);

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    if (sql.includes('COUNT(*)')) return [{ total: 137 }];
    if (sql.includes('LIMIT ? OFFSET ?'))
      return [
        {
          id: 'mov-1',
          tipo: 'venta',
          unidades_consumidas: [
            { unidad_id: 'u-1', codigo: 'LM-1', codigo_barras: null, ml_consumido: 50 }
          ]
        }
      ];
    return [];
  }),
  withTransaction: vi.fn(),
  generateUUID: () => 'id'
}));

import { buscarMovimientosRecientes } from '@/modules/inventario/movimientos/servicio';

/** Consultas del historial (el conteo y el detalle), sin la config que sigue. */
const delHistorial = () =>
  consultas.filter(
    consulta => consulta.sql.includes('COUNT(*)') || consulta.sql.includes('LIMIT ? OFFSET ?')
  );

beforeEach(() => {
  consultas.length = 0;
});

describe('historial paginado de movimientos', () => {
  it('pasa fechas, tipo y texto al SQL y pagina con LIMIT/OFFSET', async () => {
    const resultado = await buscarMovimientosRecientes({
      desde: '2026-10-01',
      hasta: '2026-10-15',
      tipo: 'venta',
      q: 'ron',
      page: 3,
      limit: 50
    });

    expect(resultado).toEqual({
      movimientos: expect.any(Array),
      total: 137,
      pagina: 3,
      paginas: 3,
      limite: 50
    });

    // Conteo y filas comparten el mismo WHERE.
    const historial = delHistorial();
    expect(historial).toHaveLength(2);
    const conteo = historial[0];
    const filas = historial[1];
    expect(conteo.sql).toContain('COUNT(*)');
    expect(conteo.sql).toContain('m.fecha_crea >= CAST(? AS date)');
    expect(conteo.sql).toContain("m.fecha_crea < CAST(? AS date) + INTERVAL '1 day'");
    expect(conteo.sql).toContain('m.tipo = ?');
    expect(conteo.sql).toContain('uu.codigo ILIKE ?');
    expect(conteo.params).toEqual([
      '2026-10-01',
      '2026-10-15',
      'venta',
      '%ron%',
      '%ron%',
      '%ron%',
      '%ron%'
    ]);

    expect(filas.sql).toContain('ORDER BY m.fecha_crea DESC');
    expect(filas.sql).toContain('LIMIT ? OFFSET ?');
    // Página 3 con 50 por página = saltar 100 filas.
    expect(filas.params).toEqual([...conteo.params, 50, 100]);
  });

  it('sin filtros conserva el orden y los valores por defecto', async () => {
    const resultado = await buscarMovimientosRecientes();

    expect(resultado.limite).toBe(100);
    expect(resultado.pagina).toBe(1);
    const historial = delHistorial();
    expect(historial).toHaveLength(2);
    expect(historial[0].params).toEqual([]);
    expect(historial[1].params).toEqual([100, 0]);
    expect(historial[0].sql).not.toContain('WHERE');
  });

  it('acota el límite y normaliza la página fuera de rango', async () => {
    const gigante = await buscarMovimientosRecientes({ limit: 5000, page: 0 });
    expect(gigante.limite).toBe(500);
    expect(gigante.pagina).toBe(1);
    expect(gigante.paginas).toBe(1); // 137 movimientos caben en una página de 500
    expect(delHistorial()[1].params).toEqual([500, 0]);

    consultas.length = 0;
    const texto = await buscarMovimientosRecientes({ limit: Number.NaN, page: -4 });
    expect(texto.limite).toBe(100);
    expect(texto.pagina).toBe(1);
    expect(delHistorial()[1].params).toEqual([100, 0]);
  });

  it('expone las filas del mismo formato que el listado anterior', async () => {
    const { movimientos } = await buscarMovimientosRecientes({ page: 2 });

    expect(movimientos).toEqual([
      expect.objectContaining({
        id: 'mov-1',
        unidades_consumidas: [
          { unidad_id: 'u-1', codigo: 'LM-1', codigo_barras: null, ml_consumido: 50 }
        ]
      })
    ]);
  });
});
