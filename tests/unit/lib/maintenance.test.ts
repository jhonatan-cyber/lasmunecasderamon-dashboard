import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ trx: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ withTransaction: mocks.transaction }));
import { cleanDatabase } from '@/lib/database/maintenance';
import {
  DATABASE_CLEAN_PROTECTED_TABLES,
  DATABASE_MIGRATION_TABLES
} from '@/lib/constants/database-maintenance';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(callback => callback(mocks.trx));
});
afterEach(() => vi.unstubAllEnvs());

it('permite limpiar en producción y conserva todas las excepciones designadas', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  mocks.trx.mockResolvedValueOnce(
    [
      ...DATABASE_CLEAN_PROTECTED_TABLES,
      ...DATABASE_MIGRATION_TABLES,
      'ventas',
      'inventario_movimiento_unidades'
    ].map(table_name => ({ table_name }))
  );
  const result = await cleanDatabase();
  expect(result.skippedTables).toEqual([
    ...DATABASE_CLEAN_PROTECTED_TABLES,
    ...DATABASE_MIGRATION_TABLES
  ]);
  expect(result.deletedTables).toEqual(['ventas', 'inventario_movimiento_unidades']);
  const truncate = mocks.trx.mock.calls
    .map(call => call[0])
    .find((sql: string) => String(sql).startsWith('TRUNCATE'));
  expect(truncate).toBe(
    'TRUNCATE TABLE "ventas", "inventario_movimiento_unidades" RESTART IDENTITY RESTRICT'
  );
});

it('vacía catálogo, compras, configuración y respaldos, preservando solamente identidad y migraciones', async () => {
  const business = [
    'configuraciones',
    'backups',
    'habitaciones',
    'productos',
    'categorias',
    'codigos',
    'inventario_presentaciones',
    'inventario_unidades',
    'inventario_movimientos',
    'compras',
    'detalle_compras',
    'producto_champagne_tiers',
    'tabla_nueva'
  ];
  expect([...DATABASE_CLEAN_PROTECTED_TABLES].sort()).toEqual(
    ['usuarios', 'roles', 'role_permissions', 'permissions'].sort()
  );
  mocks.trx.mockResolvedValueOnce(
    [...DATABASE_CLEAN_PROTECTED_TABLES, ...DATABASE_MIGRATION_TABLES, ...business].map(
      table_name => ({ table_name })
    )
  );
  const result = await cleanDatabase();
  expect(result.deletedTables).toEqual(business);
  const sql = mocks.trx.mock.calls
    .map(call => call[0])
    .find((statement: string) => String(statement).startsWith('TRUNCATE'))!;
  for (const table of business) expect(sql).toContain(`"${table}"`);
  for (const table of result.skippedTables) expect(sql).not.toContain(`"${table}"`);
  expect(sql).toMatch(/RESTART IDENTITY RESTRICT$/);
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
