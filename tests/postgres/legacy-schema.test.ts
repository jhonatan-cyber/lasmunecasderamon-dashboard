import { afterAll, beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import db, { query } from '@/lib/database/db';

/**
 * La migracion 023 retira el schema legacy_inventario, que se creo a mano para el
 * primer modulo de inventario. Lo importante que se prueba aqui es la guarda: si
 * alguna tabla conserva filas, la migracion aborta en vez de borrar datos.
 */

const migration = readFileSync(
  path.resolve('migrations/023_eliminar_schema_legacy_inventario.sql'),
  'utf8'
);

const legacyExists = async () =>
  (await query("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'legacy_inventario'"))
    .length > 0;

const legacyRows = async () =>
  (await query('SELECT count(*) AS count FROM legacy_inventario.restos'))[0].count;

beforeAll(async () => {
  await query('DROP SCHEMA IF EXISTS legacy_inventario CASCADE');
  await query('CREATE SCHEMA legacy_inventario');
  await query('CREATE TABLE legacy_inventario.restos (id varchar(36) PRIMARY KEY)');
});

afterAll(async () => {
  await query('DROP SCHEMA IF EXISTS legacy_inventario CASCADE');
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('aborta y conserva las tablas cuando el schema legacy tiene filas', async () => {
  await query("INSERT INTO legacy_inventario.restos (id) VALUES ('una-fila')");

  await expect(query(migration)).rejects.toThrow(/legacy_inventario conserva datos/);

  // Ni el schema ni la fila se pierden: el error llega antes del DROP.
  expect(await legacyExists()).toBe(true);
  expect(await legacyRows()).toBe(1);
});

it('retira el schema cuando las tablas estan vacias', async () => {
  await query('DELETE FROM legacy_inventario.restos');

  await query(migration);

  expect(await legacyExists()).toBe(false);
});

it('es idempotente: sin schema no hace nada', async () => {
  await expect(query(migration)).resolves.toBeDefined();
  expect(await legacyExists()).toBe(false);
});
