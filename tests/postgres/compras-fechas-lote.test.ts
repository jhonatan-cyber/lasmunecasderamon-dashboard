import { afterAll, expect, it } from 'vitest';
import db from '@/lib/database/db';
import { crearProducto } from '@/modules/inventario/productos/servicio';
import { registrarCompra } from '@/modules/inventario/compras/servicio';
import { ValidationError } from '@/lib/errors/errors';

const productos: string[] = [];
const compras: string[] = [];

afterAll(async () => {
  try {
    for (const compra of compras) {
      await db.pool.query('DELETE FROM inventario_unidades WHERE compra_id=$1', [compra]);
      await db.pool.query('DELETE FROM detalle_compras WHERE compra_id=$1', [compra]);
      await db.pool.query('DELETE FROM compras WHERE id=$1', [compra]);
    }
    for (const producto of productos) {
      await db.pool.query('DELETE FROM inventario_unidades WHERE producto_id=$1', [producto]);
      await db.pool.query('DELETE FROM inventario_presentaciones WHERE producto_id=$1', [producto]);
      await db.pool.query('DELETE FROM productos WHERE id_producto=$1', [producto]);
    }
  } finally {
    await db.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
});

async function crearProductoConPresentacion(nombre: string): Promise<string> {
  const producto = crypto.randomUUID();
  productos.push(producto);
  await db.pool.query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES ($1, substr($2, 1, 20), $3, 10000, 0, 'Fixture fechas de lote', now())`,
    [producto, producto, nombre]
  );
  await db.pool.query(
    `INSERT INTO inventario_presentaciones (id, producto_id, nombre, precio_venta, comision, fecha_crea)
     VALUES (gen_random_uuid(), $1, '750 ml', 10000, 0, now())`,
    [producto]
  );
  return producto;
}

it('el alta de producto guarda elaboración, duración y vencimiento', async () => {
  const creada = await crearProducto(
    {
      code: 'LOT001',
      name: 'Ron de prueba lote',
      category_id: (await db.pool.query('SELECT id_categoria FROM categorias LIMIT 1')).rows[0]
        ?.id_categoria,
      status: 1,
      fecha_elaboracion: '2026-01-15',
      duracion_meses: 6,
      // Sin vencimiento a mano: el servidor lo calcula con elaboración + duración.
      fecha_vencimiento: null
    },
    'default.png',
    [{ nombre: '750 ml', cantidad: 0 }]
  );
  expect(creada?.id).toBeTruthy();
  const { rows } = await db.pool.query(
    `SELECT fecha_elaboracion, duracion_meses, fecha_vencimiento
       FROM productos WHERE id_producto=$1`,
    [creada!.id]
  );
  expect(rows[0]).toEqual({
    fecha_elaboracion: '2026-01-15',
    duracion_meses: 6,
    fecha_vencimiento: '2026-07-15'
  });
});

it('una compra guarda las fechas por línea y calcula el vencimiento faltante', async () => {
  const producto = await crearProductoConPresentacion('Compra fechas lote');
  const { rows: pres } = await db.pool.query(
    'SELECT id FROM inventario_presentaciones WHERE producto_id=$1 LIMIT 1',
    [producto]
  );
  const { rows: users } = await db.pool.query('SELECT id_usuario FROM usuarios LIMIT 1');

  const compra = await registrarCompra(
    {
      detalles: [
        // Sin vencimiento: se calcula con elaboración + duración (12 meses).
        {
          producto_id: producto,
          presentacion_id: pres[0].id,
          cantidad: 1,
          precio_compra: 5000,
          fecha_elaboracion: '2026-03-01',
          duracion_meses: 12
        },
        // Solo vencimiento: elaboración y duración no son necesarias.
        {
          producto_id: producto,
          presentacion_id: pres[0].id,
          cantidad: 2,
          precio_compra: 6000,
          fecha_vencimiento: '2026-12-31'
        }
      ]
    },
    users[0].id_usuario
  );
  compras.push(compra.id);

  const { rows } = await db.pool.query(
    `SELECT fecha_elaboracion, duracion_meses, fecha_vencimiento, cantidad
       FROM detalle_compras WHERE compra_id=$1 ORDER BY cantidad`,
    [compra.id]
  );
  expect(rows).toEqual([
    {
      fecha_elaboracion: '2026-03-01',
      duracion_meses: 12,
      fecha_vencimiento: '2027-03-01',
      cantidad: 1
    },
    { fecha_elaboracion: null, duracion_meses: null, fecha_vencimiento: '2026-12-31', cantidad: 2 }
  ]);
});

it('rechaza una compra con el vencimiento anterior a la elaboración', async () => {
  const producto = await crearProductoConPresentacion('Compra fechas inválidas');
  const { rows: pres } = await db.pool.query(
    'SELECT id FROM inventario_presentaciones WHERE producto_id=$1 LIMIT 1',
    [producto]
  );
  const { rows: users } = await db.pool.query('SELECT id_usuario FROM usuarios LIMIT 1');

  await expect(
    registrarCompra(
      {
        detalles: [
          {
            producto_id: producto,
            presentacion_id: pres[0].id,
            cantidad: 1,
            precio_compra: 5000,
            fecha_elaboracion: '2026-05-01',
            fecha_vencimiento: '2026-04-01'
          }
        ]
      },
      users[0].id_usuario
    )
  ).rejects.toThrow(ValidationError);
});
