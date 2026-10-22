import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import type { PoolClient } from 'pg';
import db, { type TransactionQuery } from '@/lib/database/db';
import { prepareQuery } from '@/lib/database/postgres.cjs';
import { registrar, liberar } from '@/lib/transaction/infrastructure';
import {
  comprobarAnfitrionasLibresParaServicio,
  actualizarDisponibilidadAnfitrionas
} from '@/modules/identidad/disponibilidad/repositorio';

const contexto = { id: crypto.randomUUID() };
let client: PoolClient;
beforeAll(async () => {
  client = await db.pool.connect();
  await client.query('BEGIN');
  // Tablas temporales de esta conexión: nunca alteran los empleados reales.
  await client.query(`
    CREATE TEMP TABLE usuarios (id_usuario text, estado_servicio integer);
    CREATE TEMP TABLE servicios (id_servicio text, servicio_original_id text, estado integer);
    CREATE TEMP TABLE detalle_servicios (servicio_id text, usuario_id text, liberado_en timestamp);
    CREATE TEMP TABLE ventas (id_venta text, estado integer, tiempo integer);
    CREATE TEMP TABLE ventas_usuarios (venta_id text, usuario_id text);
  `);
  registrar(
    contexto.id,
    (async (sql: string, params: unknown[] = []) =>
      (await client.query(prepareQuery(sql, params))).rows) as TransactionQuery
  );
});
beforeEach(async () => {
  await client.query('TRUNCATE usuarios, servicios, detalle_servicios, ventas, ventas_usuarios');
  await client.query("INSERT INTO usuarios VALUES ('ana', 0)");
});
afterAll(async () => {
  liberar(contexto.id);
  if (client) {
    await client.query('ROLLBACK');
    client.release();
  }
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it.each([2, 3])(
  'detecta servicio estado %s aunque el indicador de usuario siga libre',
  async estado => {
    await client.query("INSERT INTO servicios VALUES ('privado', null, $1)", [estado]);
    await client.query("INSERT INTO detalle_servicios VALUES ('privado', 'ana', null)");
    await expect(comprobarAnfitrionasLibresParaServicio(['ana'], contexto)).rejects.toThrow(
      'ocupada'
    );
  }
);
it('respeta la marca de ocupada y permite el adicional del mismo privado', async () => {
  await client.query('UPDATE usuarios SET estado_servicio=1');
  await expect(comprobarAnfitrionasLibresParaServicio(['ana'], contexto)).rejects.toThrow(
    'ocupada'
  );
  await client.query(
    "INSERT INTO servicios VALUES ('privado', null, 3), ('adicional', 'privado', 2)"
  );
  await client.query(
    "INSERT INTO detalle_servicios VALUES ('privado', 'ana', null), ('adicional', 'ana', null)"
  );
  await expect(
    comprobarAnfitrionasLibresParaServicio(['ana'], contexto, 'privado')
  ).resolves.toBeUndefined();
});
it('una venta activa no ocupa a la anfitriona ni impide liberarla', async () => {
  await client.query("INSERT INTO ventas VALUES ('venta', 2, 60)");
  await client.query("INSERT INTO ventas_usuarios VALUES ('venta', 'ana')");
  await expect(comprobarAnfitrionasLibresParaServicio(['ana'], contexto)).resolves.toBeUndefined();
  await client.query('UPDATE usuarios SET estado_servicio=1');
  await actualizarDisponibilidadAnfitrionas(contexto, ['ana']);
  expect((await client.query('SELECT estado_servicio FROM usuarios')).rows[0].estado_servicio).toBe(
    0
  );
});
