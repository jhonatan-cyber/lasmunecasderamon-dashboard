import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});
it.each([
  ['2026-01-15 14:00:00', '2026-01-15T17:00:00.000Z'],
  ['2026-07-15 13:00:00', '2026-07-15T17:00:00.000Z'],
  ['2026-10-15 14:00:00', '2026-10-15T17:00:00.000Z']
])('interpreta la fecha del negocio %s con su offset historico', async (local, utc) => {
  const [result] = await query<{ inicio: Date; fin: Date }[]>(
    `SELECT (CAST(? AS timestamp) AT TIME ZONE 'America/Santiago') AS inicio,
    (CAST(? AS timestamp) AT TIME ZONE 'America/Santiago') + INTERVAL '90 minutes' AS fin`,
    [local, local]
  );
  expect(result.inicio.toISOString()).toBe(utc);
  expect(result.fin.getTime() - result.inicio.getTime()).toBe(5400000);
});
