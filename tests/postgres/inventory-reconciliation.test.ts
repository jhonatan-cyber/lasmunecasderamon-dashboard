import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import db, { withTransaction } from '@/lib/database/db';
import { reclasificarUnidadesPendientes } from '@/modules/inventario/reconciliacion/repositorio';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('reclasifica códigos físicos de Bodega sin alterar el stock y no repite una unidad', async () => {
  const rollback = new Error('Rollback del fixture de conciliación de inventario');
  try {
    await withTransaction(async trx => {
      const productoId = randomUUID();
      const presentacionOrigenId = randomUUID();
      const presentacionDestinoId = randomUUID();
      const transferenciaId = randomUUID();
      const unidadId = randomUUID();
      const suffix = productoId.slice(0, 8);
      const codigoBarras = `29${suffix}0001`;

      await trx(
        `INSERT INTO productos
         (id_producto, codigo, nombre, precio, comision, descripcion, stock_almacen, fecha_crea)
         VALUES (?, ?, ?, 70000, 15000, 'Fixture de conciliación', 1, now())`,
        [productoId, `RC${suffix}`, `Conciliación ${suffix}`]
      );
      await trx(
        `INSERT INTO inventario_presentaciones
         (id, producto_id, nombre, precio_venta, comision, fecha_crea)
         VALUES (?, ?, 'Stock legado (formato por confirmar)', 70000, 15000, now()),
                (?, ?, 'Botella 750 ml', 70000, 15000, now())`,
        [presentacionOrigenId, productoId, presentacionDestinoId, productoId]
      );
      await trx(
        `INSERT INTO inventario_unidades
         (id, producto_id, presentacion_id, codigo, codigo_barras, ubicacion, estado, fecha_crea)
         VALUES (?, ?, ?, ?, ?, 'almacen', 'almacen', now())`,
        [unidadId, productoId, presentacionOrigenId, `LM-RC${suffix}`, codigoBarras]
      );
      await trx(
        `INSERT INTO inventario_movimientos
         (id, tipo, producto_id, presentacion_id, cantidad, estado, fecha_crea)
         VALUES (?, 'traspaso', ?, ?, 1, 'pendiente', now())`,
        [transferenciaId, productoId, presentacionOrigenId]
      );

      const input = {
        productoId,
        presentacionOrigenId,
        presentacionDestinoId,
        codigosUnidades: [codigoBarras]
      };
      await expect(reclasificarUnidadesPendientes(trx, input)).rejects.toThrow(
        'Recibe o cancela la transferencia pendiente antes de conciliar'
      );

      await trx('DELETE FROM inventario_movimientos WHERE id = ?', [transferenciaId]);
      await expect(reclasificarUnidadesPendientes(trx, input)).resolves.toBe(1);
      await expect(reclasificarUnidadesPendientes(trx, input)).rejects.toThrow(
        'No se encontraron todas las unidades seleccionadas en Bodega'
      );

      const [unidad] = await trx<{ presentacion_id: string; ubicacion: string; estado: string }[]>(
        `SELECT presentacion_id, ubicacion, estado
           FROM inventario_unidades WHERE id = ?`,
        [unidadId]
      );
      expect(unidad).toEqual({
        presentacion_id: presentacionDestinoId,
        ubicacion: 'almacen',
        estado: 'almacen'
      });
      const [{ stock_almacen, unidades }] = await trx<
        { stock_almacen: number; unidades: string }[]
      >(
        `SELECT p.stock_almacen, COUNT(u.id)::text AS unidades
           FROM productos p
           LEFT JOIN inventario_unidades u
             ON u.producto_id = p.id_producto AND u.estado = 'almacen' AND u.ubicacion = 'almacen'
          WHERE p.id_producto = ?
          GROUP BY p.stock_almacen`,
        [productoId]
      );
      expect(stock_almacen).toBe(1);
      expect(Number(unidades)).toBe(1);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
