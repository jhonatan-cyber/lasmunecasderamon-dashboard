import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  invalidate: vi.fn(),
  release: vi.fn(),
  trx: vi.fn()
}));
vi.mock('@/lib/utils/env', () => ({ env: {} }));
vi.mock('@/lib/database/postgres.cjs', () => ({ prepareQuery: (sql: string) => sql }));
vi.mock('@/lib/cache/dashboardCache', () => ({ invalidateDashboardCache: mock.invalidate }));
import { query, withTransaction, rawQuery } from '@/lib/database/db';

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.__lasMunecasPgPool = { query: mock.query, connect: mock.connect } as any;
  mock.connect.mockResolvedValue({ query: mock.trx, release: mock.release });
  mock.invalidate.mockResolvedValue(undefined);
  mock.trx.mockImplementation(async (sql: string) => ({ command: sql.split(' ')[0], rows: [] }));
});

describe('dashboard invalidation after database commits', () => {
  it.each(['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'])('invalidates after %s', async command => {
    mock.query.mockResolvedValue({ command, rows: [] });
    await query(`${command} ventas`);
    expect(mock.invalidate).toHaveBeenCalledOnce();
  });
  it('does not invalidate on reads or failed writes', async () => {
    mock.query.mockResolvedValueOnce({ command: 'SELECT', rows: [] });
    await query('SELECT * FROM ventas');
    mock.query.mockRejectedValueOnce(new Error('write failed'));
    await expect(query('UPDATE ventas SET estado=0')).rejects.toThrow('write failed');
    expect(mock.invalidate).not.toHaveBeenCalled();
  });
  it('invalidates once after a transaction commits and releases its connection', async () => {
    mock.invalidate.mockImplementation(async () => {
      expect(mock.trx).toHaveBeenLastCalledWith('COMMIT');
      expect(mock.release).toHaveBeenCalledOnce();
    });
    await withTransaction(async trx => {
      await trx('UPDATE ventas SET estado=0');
      await trx('DELETE FROM detalle_ventas');
      expect(mock.invalidate).not.toHaveBeenCalled();
    });
    expect(mock.invalidate).toHaveBeenCalledOnce();
  });
  it('does not invalidate rolled back transactions', async () => {
    await expect(
      withTransaction(async trx => {
        await trx('UPDATE ventas SET estado=0');
        throw new Error('abort');
      })
    ).rejects.toThrow('abort');
    expect(mock.trx).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mock.invalidate).not.toHaveBeenCalled();
  });
  it('detects writable CTEs and raw queries', async () => {
    mock.query.mockResolvedValueOnce({ command: 'SELECT', rows: [] });
    await query('WITH changed AS (UPDATE ventas SET estado=0 RETURNING *) SELECT * FROM changed');
    mock.query.mockResolvedValueOnce({ command: 'DELETE', rows: [] });
    await rawQuery('DELETE FROM ventas');
    expect(mock.invalidate).toHaveBeenCalledTimes(2);
  });
  it('does not report a committed write as failed when invalidation fails', async () => {
    mock.query.mockResolvedValue({ command: 'UPDATE', rows: [{ id: 1 }] });
    mock.invalidate.mockRejectedValue(new Error('Redis unavailable'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(query('UPDATE ventas SET estado=0')).resolves.toEqual([{ id: 1 }]);
    warning.mockRestore();
  });
});
