import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ trx: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ withTransaction: mocks.transaction }));
import { cleanDatabase } from '@/lib/database/maintenance';
import { DATABASE_CLEAN_PROTECTED_TABLES } from '@/lib/constants/database-maintenance';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(callback => callback(mocks.trx));
});
afterEach(() => vi.unstubAllEnvs());

it('permite limpiar en producción y conserva todas las excepciones designadas', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  mocks.trx.mockResolvedValueOnce(
    [...DATABASE_CLEAN_PROTECTED_TABLES, 'ventas', 'inventario_movimiento_unidades'].map(
      table_name => ({ table_name })
    )
  );
  const result = await cleanDatabase();
  expect(result.skippedTables).toEqual([...DATABASE_CLEAN_PROTECTED_TABLES]);
  expect(result.deletedTables).toEqual(['ventas', 'inventario_movimiento_unidades']);
  expect(mocks.trx.mock.calls[1][0]).toBe(
    'TRUNCATE TABLE "ventas", "inventario_movimiento_unidades" RESTART IDENTITY RESTRICT'
  );
});

it('propaga errores de relaciones para que la transacción revierta todo', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ table_name: 'ventas' }])
    .mockRejectedValueOnce(new Error('FK'));
  await expect(cleanDatabase()).rejects.toThrow('FK');
});

it('no ejecuta TRUNCATE cuando solo existen tablas protegidas', async () => {
  mocks.trx.mockResolvedValueOnce([{ table_name: 'usuarios' }]);
  expect(await cleanDatabase()).toEqual({ deletedTables: [], skippedTables: ['usuarios'] });
  expect(mocks.trx).toHaveBeenCalledTimes(1);
});
