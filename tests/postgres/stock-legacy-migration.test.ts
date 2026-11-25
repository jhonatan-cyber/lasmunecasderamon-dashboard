import { afterAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import db, { withTransaction } from '@/lib/database/db';

const migration = readFileSync(
  path.resolve('migrations/128_stock_legado_por_presentacion.sql'),
  'utf8'
);

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('conserva y asigna el stock legado sin duplicarlo al repetir la migración', async () => {
  const rollback = new Error('Rollback del fixture de migración de stock legado');
  try {
    await withTransaction(async trx => {
      const productIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
      const presentationIds = [randomUUID(), randomUUID(), randomUUID()];
      const suffix = randomUUID().slice(0, 8);

      for (const [index, productId] of productIds.entries()) {
        await trx(
          `INSERT INTO productos
           (id_producto, codigo, nombre, precio, comision, descripcion, stock_almacen, fecha_crea)
           VALUES (?, ?, ?, 70000, 15000, 'Fixture stock legado', ?, now())`,
          [productId, `ML${suffix}${index}`, `Producto migración ${index}`, [2, 3, 4, 0][index]]
        );
      }

      for (const [index, productIndex] of [1, 2, 2].entries()) {
        await trx(
          `INSERT INTO inventario_presentaciones
           (id, producto_id, nombre, precio_venta, comision, fecha_crea)
           VALUES (?, ?, ?, 50000, 10000, now())`,
          [presentationIds[index], productIds[productIndex], `Formato ${index}`]
        );
      }

      const insertarUnidad = async (
        productoId: string,
        codigo: string,
        presentacionId: string | null
      ) => {
        await trx(
          `INSERT INTO inventario_unidades
           (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
           VALUES (?, ?, ?, ?, 'almacen', 'almacen', now())`,
          [randomUUID(), productoId, presentacionId, codigo]
        );
      };

      await insertarUnidad(productIds[1], `MLX${suffix}1`, presentationIds[0]);
      await insertarUnidad(productIds[1], `MLX${suffix}2`, null);
      await insertarUnidad(productIds[2], `MLX${suffix}3`, presentationIds[1]);
      await insertarUnidad(productIds[2], `MLX${suffix}4`, null);

      await trx(migration);
      await trx(migration);

      const migrated = await trx<
        { producto_id: string; presentacion_nombre: string; stock: string; codigos: string[] }[]
      >(
        `SELECT p.id_producto AS producto_id, ip.nombre AS presentacion_nombre,
                COUNT(u.id)::text AS stock, array_agg(u.codigo ORDER BY u.codigo) AS codigos
           FROM productos p
           JOIN inventario_unidades u ON u.producto_id = p.id_producto
           JOIN inventario_presentaciones ip ON ip.id = u.presentacion_id
          WHERE p.id_producto IN (?) AND u.estado = 'almacen' AND u.ubicacion = 'almacen'
          GROUP BY p.id_producto, ip.nombre
          ORDER BY p.id_producto, ip.nombre`,
        [productIds]
      );

      const legacy = migrated.filter(
        row => row.presentacion_nombre === 'Stock legado (formato por confirmar)'
      );
      expect(legacy).toHaveLength(3);
      expect(legacy.map(row => Number(row.stock)).sort()).toEqual([2, 2, 3]);
      expect(migrated.find(row => row.presentacion_nombre === 'Formato 0')?.stock).toBe('1');
      expect(migrated.find(row => row.presentacion_nombre === 'Formato 1')?.stock).toBe('1');

      const totals = await trx<{ producto_id: string; stock_almacen: number; unidades: string }[]>(
        `SELECT p.id_producto AS producto_id, p.stock_almacen,
                COUNT(u.id)::text AS unidades
           FROM productos p
           LEFT JOIN inventario_unidades u
             ON u.producto_id = p.id_producto AND u.estado = 'almacen' AND u.ubicacion = 'almacen'
          WHERE p.id_producto IN (?)
          GROUP BY p.id_producto, p.stock_almacen`,
        [productIds]
      );
      expect(totals).toHaveLength(4);
      expect(totals.every(row => Number(row.stock_almacen) === Number(row.unidades))).toBe(true);

      const [{ duplicados }] = await trx<{ duplicados: string }[]>(
        `SELECT (COUNT(*) - COUNT(DISTINCT codigo))::text AS duplicados
           FROM inventario_unidades WHERE producto_id IN (?)`,
        [productIds]
      );
      expect(Number(duplicados)).toBe(0);

      const presentaciones = await trx<
        { producto_id: string; nombres: string[]; cantidad: string }[]
      >(
        `SELECT p.id_producto AS producto_id,
                array_agg(ip.nombre) FILTER (WHERE ip.id IS NOT NULL) AS nombres,
                COUNT(ip.id)::text AS cantidad
           FROM productos p
           LEFT JOIN inventario_presentaciones ip ON ip.producto_id = p.id_producto
          WHERE p.id_producto IN (?)
          GROUP BY p.id_producto
          ORDER BY p.id_producto`,
        [productIds]
      );
      expect(presentaciones).toHaveLength(4);
      expect(presentaciones.find(row => row.producto_id === productIds[3])).toMatchObject({
        nombres: ['Formato por confirmar'],
        cantidad: '1'
      });
      expect(migrated.some(row => row.producto_id === productIds[3])).toBe(false);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
