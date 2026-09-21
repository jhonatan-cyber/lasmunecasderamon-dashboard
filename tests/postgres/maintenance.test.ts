import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { cleanDatabase, restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('backs up, cleans and restores data without losing protected records or relationships', async () => {
  const snapshot = await snapshotDatabase();
  const backupId = crypto.randomUUID();
  const [usersBefore] = await query('SELECT count(*) AS count FROM usuarios');
  await query(
    `INSERT INTO backups (id_backup, nombre, descripcion, tablas_incluidas, registros_count,
    tamano_bytes, json_data, fecha_crea, estado) VALUES (?, 'PG test', 'test', '[]', '0', 0, ?, now(), 1)`,
    [backupId, JSON.stringify(snapshot)]
  );
  try {
    const clean = await cleanDatabase();
    expect(clean.skippedTables).toContain('_postgres_migrations');
    expect(clean.skippedTables).toContain('usuarios');
    expect((await query('SELECT count(*) AS count FROM usuarios'))[0]).toEqual(usersBefore);
    expect((await query('SELECT count(*) AS count FROM ventas'))[0].count).toBe(0);
    const result = await restoreDatabase(snapshot, backupId);
    expect(result.registros).toBe(
      Object.values(snapshot).reduce((sum, rows) => sum + rows.length, 0)
    );
    expect((await query('SELECT count(*) AS count FROM ventas'))[0].count).toBe(
      snapshot.ventas.length
    );
    expect(
      (await query('SELECT estado FROM backups WHERE id_backup = ?', [backupId]))[0].estado
    ).toBe(2);
    expect(
      await query("SELECT conname FROM pg_constraint WHERE contype = 'f' AND NOT convalidated")
    ).toEqual([]);
  } finally {
    await restoreDatabase(snapshot, backupId);
    await query('DELETE FROM backups WHERE id_backup = ?', [backupId]);
  }
});

it('rejects protected tables and rolls back incomplete restores', async () => {
  const snapshot = await snapshotDatabase();
  await expect(restoreDatabase({ usuarios: [] }, 'missing')).rejects.toThrow(
    'Invalid backup table'
  );
  const broken = {
    ...snapshot,
    logins: [
      {
        id_login: crypto.randomUUID(),
        usuario_id: 'missing-user',
        last_login: '2026-09-19 10:00:00',
        estado: 1,
        en_local: 1
      }
    ]
  };
  await expect(restoreDatabase(broken, 'missing')).rejects.toThrow();
  expect((await query('SELECT count(*) AS count FROM ventas'))[0].count).toBe(
    snapshot.ventas.length
  );
});
