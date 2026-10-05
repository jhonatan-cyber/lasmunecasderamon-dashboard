import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { listarParaVenta } from '@/modules/inventario';
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
    { filters: { term: ' ron ' }, params: ['%ron%', '%ron%', '%ron%', '%ron%'] },
    {
      filters: { category_id: 'cat1', term: 'ron' },
      params: ['cat1', '%ron%', '%ron%', '%ron%', '%ron%']
    }
  ])('enlaza los filtros $filters con el adaptador PostgreSQL', async ({ filters, params }) => {
    await expect(listarParaVenta(filters)).resolves.toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ubicacion = 'bar'"), params);
  });
});
