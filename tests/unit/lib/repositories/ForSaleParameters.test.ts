import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { listarParaVenta } from '@/modules/inventario';
import { CATEGORIA_BEBIDAS_ANALCOHOLICAS } from '@/lib/business/colacionRoles';
import { query } from '@/lib/database/db';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  generateUUID: vi.fn()
}));
const require = createRequire(import.meta.url);
const { prepareQuery } = require('../../../../lib/database/postgres.cjs');

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(query).mockImplementation(async (sql, params) => {
    // Ejecuta el adaptador real: un parámetro omitido debe fallar como en producción.
    prepareQuery(sql, params);
    return [] as any;
  });
});

describe('parámetros del catálogo del bar', () => {
  it.each([
    { filters: undefined, params: [] },
    { filters: { category_id: 'cat1' }, params: ['cat1'] },
    { filters: { term: ' ron ' }, params: ['%ron%', '%ron%', '%ron%', '%ron%', '%ron%'] },
    {
      filters: { category_id: 'cat1', term: 'ron' },
      params: ['cat1', '%ron%', '%ron%', '%ron%', '%ron%', '%ron%']
    }
  ])('enlaza los filtros $filters con el adaptador PostgreSQL', async ({ filters, params }) => {
    await expect(listarParaVenta(filters)).resolves.toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ubicacion = 'bar'"), params);
  });

  it('expone el ml restante de la botella abierta para la colación', async () => {
    vi.mocked(query).mockImplementation(async (sql: string) => {
      if (String(sql).includes('FROM inventario_presentaciones')) {
        return [
          {
            presentacion_id: 'p1',
            presentacion_nombre: '750 ml',
            codigo_barras: null,
            presentacion_foto: null,
            precio_venta: 0,
            presentacion_comision: 0,
            opciones_venta: [],
            ml_botella: 750,
            stock_bar: 2,
            ml_abierta: 320,
            producto_id: 'pr1',
            producto_codigo: 'P1',
            producto_nombre: 'Whisky',
            producto_foto: null,
            categoria_id: null,
            categoria_nombre: null,
            ml_shot: null,
            ml_shot_anfitriona: null,
            max_anfitrionas: null
          }
        ] as any;
      }
      return [] as any;
    });

    const [fila] = await listarParaVenta({ solo_colaciones: true });
    expect(fila).toMatchObject({ presentacion_id: 'p1', stock_bar: 2, ml_abierta: 320 });
  });

  it('filtra bebidas analcohólicas habilitadas para colación con la categoría compartida', async () => {
    await expect(listarParaVenta({ solo_colaciones_analcoholicas: true })).resolves.toEqual([]);
    const call = vi
      .mocked(query)
      .mock.calls.find(([statement]) =>
        String(statement).includes('FROM inventario_presentaciones')
      );
    const sql = String(call?.[0] ?? '');
    expect(sql).toContain('c.system_key = ?');
    expect(sql).toContain('colacion_habilitada');
    expect(call?.[1]).toEqual([CATEGORIA_BEBIDAS_ANALCOHOLICAS]);
  });
});
