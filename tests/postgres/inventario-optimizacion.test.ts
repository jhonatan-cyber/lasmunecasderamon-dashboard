import { afterAll, afterEach, expect, it } from 'vitest';
import type { PoolClient } from 'pg';
import db, { type TransactionQuery } from '@/lib/database/db';
import { prepareQuery } from '@/lib/database/postgres.cjs';
import { consumirStock } from '@/modules/inventario/bar/consumoRepositorio';

const productos: string[] = [];
const trxDe =
  (client: PoolClient): TransactionQuery =>
  async <R>(sql: string, params: unknown[] = []) =>
    (await client.query(prepareQuery(sql, params))).rows as R;
const contexto = async () => {
  const { rows } = await db.pool.query('SELECT id_usuario FROM usuarios LIMIT 1');
  return { usuarioId: rows[0].id_usuario as string, fecha: '2026-10-15 12:00:00' };
};
async function fixture(presentaciones = 1) {
  const producto = crypto.randomUUID();
  productos.push(producto);
  await db.pool.query(
    `INSERT INTO productos (id_producto,codigo,nombre,precio,comision,descripcion,fecha_crea)
    VALUES ($1,$2,'Test optimizacion inventario',10000,0,'Fixture propio',now())`,
    [producto, producto.slice(0, 20)]
  );
  const ids = Array.from({ length: presentaciones }, () => crypto.randomUUID()).sort((a, b) =>
    a.localeCompare(b)
  );
  const unidades: string[] = [];
  for (const id of ids) {
    await db.pool.query(
      `INSERT INTO inventario_presentaciones (id,producto_id,nombre,precio_venta,comision,ml_botella,fecha_crea)
      VALUES ($1,$2,'750 ml',10000,0,750,now())`,
      [id, producto]
    );
    const unit = crypto.randomUUID();
    unidades.push(unit);
    await db.pool.query(
      `INSERT INTO inventario_unidades (id,producto_id,presentacion_id,codigo,estado,ubicacion,ml_restante,fecha_crea)
      VALUES ($1,$2,$3,$4,'almacen','bar',0,now())`,
      [unit, producto, id, unit.slice(0, 20)]
    );
  }
  return { producto, ids, unidades };
}
afterEach(async () => {
  for (const id of productos.splice(0)) {
    await db.pool.query(
      `DELETE FROM inventario_movimiento_unidades WHERE movimiento_id IN
      (SELECT id FROM inventario_movimientos WHERE producto_id=$1)`,
      [id]
    );
    await db.pool.query('DELETE FROM inventario_movimientos WHERE producto_id=$1', [id]);
    await db.pool.query('DELETE FROM productos WHERE id_producto=$1', [id]);
  }
});
afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('mantiene la traza y revierte unidades y movimientos tras un error posterior al consumo', async () => {
  const f = await fixture();
  const ctx = await contexto();
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await consumirStock(trxDe(client), [{ presentacion_id: f.ids[0], cantidad: 1 }], ctx);
    const { rows } = await client.query(
      `SELECT mu.unidad_id,mu.ml_consumido,m.cantidad FROM inventario_movimiento_unidades mu
      JOIN inventario_movimientos m ON m.id=mu.movimiento_id WHERE m.producto_id=$1`,
      [f.producto]
    );
    expect(rows).toEqual([{ unidad_id: f.unidades[0], ml_consumido: 0, cantidad: 1 }]);
    // Simula un fallo posterior, antes del COMMIT del caso de uso.
    await expect(client.query('SELECT 1/0')).rejects.toMatchObject({ code: '22012' });
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
  expect(
    (
      await db.pool.query('SELECT estado,ml_restante FROM inventario_unidades WHERE id=$1', [
        f.unidades[0]
      ])
    ).rows
  ).toEqual([{ estado: 'almacen', ml_restante: 0 }]);
  expect(
    (
      await db.pool.query('SELECT id FROM inventario_movimientos WHERE producto_id=$1', [
        f.producto
      ])
    ).rows
  ).toEqual([]);
});

it('revierte el primer descuento si falta stock en la siguiente presentación ordenada', async () => {
  const f = await fixture(2),
    ctx = await contexto(),
    client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await expect(
      consumirStock(
        trxDe(client),
        [
          { presentacion_id: f.ids[1], cantidad: 2 },
          { presentacion_id: f.ids[0], cantidad: 1 }
        ],
        ctx
      )
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_BAR_STOCK',
      details: { presentacion_id: f.ids[1] }
    });
    expect(
      (
        await client.query(
          'SELECT presentacion_id FROM inventario_movimientos WHERE producto_id=$1',
          [f.producto]
        )
      ).rows
    ).toEqual([{ presentacion_id: f.ids[0] }]);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
  expect(
    (
      await db.pool.query(
        "SELECT count(*)::int AS n FROM inventario_unidades WHERE producto_id=$1 AND estado='almacen'",
        [f.producto]
      )
    ).rows[0].n
  ).toBe(2);
  expect(
    (
      await db.pool.query('SELECT id FROM inventario_movimientos WHERE producto_id=$1', [
        f.producto
      ])
    ).rows
  ).toEqual([]);
});

it('serializa dos consumos de la misma unidad sin sobreventa al reutilizar la presentación', async () => {
  const f = await fixture(),
    ctx = await contexto();
  const primero = await db.pool.connect(),
    segundo = await db.pool.connect();
  let liberar!: () => void, seleccionado!: () => void;
  const gate = new Promise<void>(r => {
    liberar = r;
  });
  const listo = new Promise<void>(r => {
    seleccionado = r;
  });
  let a: Promise<unknown> | undefined, b: Promise<unknown> | undefined;
  try {
    await primero.query('BEGIN');
    await segundo.query('BEGIN');
    const trx = trxDe(primero);
    const pausado: TransactionQuery = async <R>(sql: string, params: unknown[] = []) => {
      const result = await trx<R>(sql, params);
      if (sql.includes('FROM inventario_unidades')) {
        seleccionado();
        await gate;
      }
      return result;
    };
    a = consumirStock(pausado, [{ presentacion_id: f.ids[0], cantidad: 1 }], ctx);
    await Promise.race([listo, a]);
    // Captura el rechazo inmediatamente para no producir una promesa sin manejar.
    b = consumirStock(trxDe(segundo), [{ presentacion_id: f.ids[0], cantidad: 1 }], ctx).then(
      () => ({ ok: true }),
      error => ({ ok: false, code: error.code })
    );
    const pid = (segundo as PoolClient & { processID: number }).processID;
    await expect
      .poll(
        async () =>
          (
            await db.pool.query(
              `SELECT wait_event_type, query FROM pg_stat_activity
      WHERE pid=$1 AND cardinality(pg_blocking_pids(pid))>0`,
              [pid]
            )
          ).rows[0],
        { timeout: 3000, interval: 10 }
      )
      .toMatchObject({
        wait_event_type: 'Lock',
        // El bloqueo sigue siendo sobre las presentaciones, en orden de id.
        query: expect.stringContaining('ORDER BY id FOR UPDATE')
      });
    liberar();
    await a;
    await primero.query('COMMIT');
    expect(await b).toEqual({ ok: false, code: 'INSUFFICIENT_BAR_STOCK' });
    await segundo.query('ROLLBACK');
    expect(
      (
        await db.pool.query('SELECT cantidad FROM inventario_movimientos WHERE producto_id=$1', [
          f.producto
        ])
      ).rows
    ).toEqual([{ cantidad: 1 }]);
  } finally {
    liberar();
    await a?.catch(() => {});
    await primero.query('ROLLBACK');
    await b?.catch(() => {});
    await segundo.query('ROLLBACK');
    primero.release();
    segundo.release();
  }
});

it('lee los ml del producto en la fase original de consumo de shots', async () => {
  const f = await fixture(),
    ctx = await contexto(),
    client = await db.pool.connect();
  const original = trxDe(client);
  try {
    await client.query('BEGIN');
    const trx: TransactionQuery = async <R>(sql: string, params: unknown[] = []) => {
      const result = await original<R>(sql, params);
      if (sql.includes('opciones_venta') && sql.includes('FROM inventario_presentaciones'))
        await db.pool.query('UPDATE productos SET ml_shot=100 WHERE id_producto=$1', [f.producto]);
      return result;
    };
    await consumirStock(trx, [{ presentacion_id: f.ids[0], cantidad: 1, tipo_venta: 'shot' }], ctx);
    expect(
      (
        await client.query('SELECT ml_restante FROM inventario_unidades WHERE id=$1', [
          f.unidades[0]
        ])
      ).rows[0].ml_restante
    ).toBe(650);
    expect(
      (
        await client.query(
          `SELECT mu.ml_consumido FROM inventario_movimiento_unidades mu
      JOIN inventario_movimientos m ON m.id=mu.movimiento_id WHERE m.producto_id=$1`,
          [f.producto]
        )
      ).rows[0].ml_consumido
    ).toBe(100);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
