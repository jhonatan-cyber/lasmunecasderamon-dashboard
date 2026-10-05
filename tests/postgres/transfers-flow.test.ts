import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import db, { withTransaction } from '@/lib/database/db';
import { ESTADO_UNIDAD_ACTIVA, listarPresentaciones, traspasarAlBar } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('consulta presentaciones y transfiere unidades con botella y shot en la misma solicitud', async () => {
  const rollback = new Error('Rollback del fixture de transferencia');
  try {
    await withTransaction(async trx => {
      const productoId = randomUUID();
      const presentacionId = randomUUID();
      const suffix = productoId.slice(0, 8);
      const [user] = await trx('SELECT id_usuario FROM usuarios LIMIT 1');
      expect(user).toBeDefined();
      await trx(
        `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
         VALUES (?, ?, ?, 70000, 15000, 'Fixture transferencia', now())`,
        [productoId, `TR${suffix}`, 'Producto transferencia']
      );
      await trx(
        `INSERT INTO inventario_presentaciones
         (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
         VALUES (?, ?, '1000 ml', 70000, 15000, 1000, now())`,
        [presentacionId, productoId]
      );
      for (const [index, location, remaining] of [
        [0, 'almacen', null],
        [1, 'almacen', null],
        [2, 'bar', 750]
      ] as const) {
        await trx(
          `INSERT INTO inventario_unidades
           (id, producto_id, presentacion_id, codigo, ubicacion, estado, ml_restante, fecha_crea)
           VALUES (?, ?, ?, ?, ?, ?, ?, now())`,
          [
            randomUUID(),
            productoId,
            presentacionId,
            `TU${suffix}${index}`,
            location,
            ESTADO_UNIDAD_ACTIVA,
            remaining
          ]
        );
      }
      const [presentation] = await conContextoOperacionExistente(trx, contexto =>
        listarPresentaciones(productoId, contexto)
      );
      expect(presentation).toMatchObject({
        id: presentacionId,
        stock: 2,
        stock_bar: 1,
        ml_abierta: 750
      });
      const options = [
        { tipo: 'botella' as const, precio: 70000, comision: 15000 },
        { tipo: 'shot' as const, precio: 5000, comision: 0 }
      ];
      const result = await conContextoOperacionExistente(trx, contexto =>
        traspasarAlBar(
          {
            producto_id: productoId,
            presentacion_id: presentacionId,
            cantidad: 1,
            usuario_id: user.id_usuario,
            opciones_venta: options
          },
          contexto
        )
      );
      expect(result).toEqual({ trasladadas: 1, stock_bar: 1 });
      const [movement] = await trx(
        'SELECT estado, opciones_venta, precio_venta, comision FROM inventario_movimientos WHERE presentacion_id = ?',
        [presentacionId]
      );
      expect(movement).toMatchObject({
        estado: 'pendiente',
        opciones_venta: options,
        precio_venta: 70000,
        comision: 15000
      });
      const [updated] = await conContextoOperacionExistente(trx, contexto =>
        listarPresentaciones(productoId, contexto)
      );
      expect(updated).toMatchObject({ stock: 1, stock_bar: 1, ml_abierta: 750 });
      const [{ total }] = await trx(
        "SELECT COUNT(*) AS total FROM inventario_unidades WHERE presentacion_id = ? AND ubicacion = 'transito'",
        [presentacionId]
      );
      expect(Number(total)).toBe(1);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
