import { afterAll, expect, it } from 'vitest';
import db, { type TransactionQuery } from '@/lib/database/db';
import { prepareQuery } from '@/lib/database/postgres.cjs';
import { sincronizarReposicion } from '@/modules/inventario/reposicion/servicio';

afterAll(async () => {
  await db.pool.end();
});

it('suma Bar y Bodega, evita órdenes duplicadas y ajusta o resuelve la compra al variar el stock', async () => {
  const client = await db.pool.connect();
  const trx: TransactionQuery = async <T>(sql: string, params: unknown[] = []) =>
    (await client.query(prepareQuery(sql, params))).rows as T;
  const producto = crypto.randomUUID();
  const pres = crypto.randomUUID();
  const nombre = `Prueba reposicion ${producto}`;
  try {
    await client.query('BEGIN');
    await trx(
      "INSERT INTO productos(id_producto,codigo,nombre,precio,comision,descripcion,fecha_crea,estado) VALUES (?, ?, ?, 1000, 0, 'Prueba temporal', CURRENT_TIMESTAMP, 1)",
      [producto, producto.slice(0, 20), nombre]
    );
    await trx(
      "INSERT INTO inventario_presentaciones(id,producto_id,nombre,precio_compra,stock_minimo,stock_maximo,fecha_crea) VALUES (?, ?, '750 ml', 100, 5, 12, CURRENT_TIMESTAMP)",
      [pres, producto]
    );
    const add = async (ubicacion: string) => {
      const id = crypto.randomUUID();
      await trx(
        "INSERT INTO inventario_unidades(id,producto_id,presentacion_id,codigo,estado,ubicacion,fecha_crea) VALUES (?, ?, ?, ?, 'almacen', ?, CURRENT_TIMESTAMP)",
        [id, producto, pres, id.slice(0, 20), ubicacion]
      );
      return id;
    };
    const unit = await add('almacen');
    await add('almacen');
    await add('bar');
    const first = (await sincronizarReposicion(trx)).rows.find(row => row.producto === nombre)!;
    expect(first).toMatchObject({
      stock_bodega: 2,
      stock_bar: 1,
      stock_actual: 3,
      cantidad: 9,
      stock_maximo: 12
    });
    const second = (await sincronizarReposicion(trx)).rows.find(row => row.producto === nombre)!;
    expect(second.id).toBe(first.id);
    const notes = await trx<any[]>('SELECT id FROM notificaciones WHERE datos LIKE ?', [
      `%${first.id}%`
    ]);
    expect(notes).toHaveLength(2);
    await trx("UPDATE inventario_unidades SET ubicacion = 'bar' WHERE id = ?", [unit]);
    expect((await sincronizarReposicion(trx)).rows.find(row => row.id === first.id)?.cantidad).toBe(
      9
    );
    await trx("UPDATE inventario_unidades SET estado = 'vendida' WHERE id = ?", [unit]);
    expect((await sincronizarReposicion(trx)).rows.find(row => row.id === first.id)?.cantidad).toBe(
      10
    );
    await add('almacen');
    await add('almacen');
    await add('almacen');
    expect(
      (await sincronizarReposicion(trx)).rows.find(row => row.id === first.id)
    ).toBeUndefined();
    const [closed] = await trx<any[]>('SELECT estado FROM ordenes_reposicion WHERE id = ?', [
      first.id
    ]);
    expect(closed.estado).toBe('resuelta');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
