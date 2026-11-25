import { query, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/errors';
import type { StockReconciliationRow } from './modelo';
import { esPresentacionPendiente, NOMBRES_PRESENTACION_PENDIENTE } from './modelo';

export type ReclasificarStockPendienteInput = {
  productoId: string;
  presentacionOrigenId: string;
  presentacionDestinoId: string;
  codigosUnidades: string[];
};

export async function listarFilasStockConciliacion(): Promise<StockReconciliationRow[]> {
  return await query<StockReconciliationRow[]>(
    `WITH stock_presentaciones AS (
       SELECT producto_id, presentacion_id, COUNT(*)::integer AS stock_bodega
         FROM inventario_unidades
        WHERE estado = 'almacen' AND ubicacion = 'almacen'
        GROUP BY producto_id, presentacion_id
     ), stock_productos AS (
       SELECT producto_id, COUNT(*)::integer AS stock_unidades
         FROM inventario_unidades
        WHERE estado = 'almacen' AND ubicacion = 'almacen'
        GROUP BY producto_id
     )
     SELECT p.id_producto AS producto_id,
            p.nombre AS producto_nombre,
            p.codigo AS producto_codigo,
            COALESCE(p.stock_almacen, 0)::integer AS stock_producto,
            COALESCE(sp.stock_unidades, 0)::integer AS stock_unidades,
            ip.id AS presentacion_id,
            ip.nombre AS presentacion_nombre,
            COALESCE(spr.stock_bodega, 0)::integer AS stock_presentacion
       FROM productos p
       LEFT JOIN stock_productos sp ON sp.producto_id = p.id_producto
       LEFT JOIN inventario_presentaciones ip ON ip.producto_id = p.id_producto
       LEFT JOIN stock_presentaciones spr
         ON spr.producto_id = p.id_producto AND spr.presentacion_id = ip.id
      WHERE p.stock_almacen IS DISTINCT FROM COALESCE(sp.stock_unidades, 0)
         OR (ip.nombre IN (?, ?) AND COALESCE(spr.stock_bodega, 0) > 0)
      ORDER BY p.nombre, ip.nombre, ip.id`,
    [...NOMBRES_PRESENTACION_PENDIENTE]
  );
}

export async function reclasificarUnidadesPendientes(
  trx: TransactionQuery,
  input: ReclasificarStockPendienteInput
): Promise<number> {
  if (input.presentacionOrigenId === input.presentacionDestinoId) {
    throw new ValidationError('Selecciona una presentación distinta como destino');
  }

  const [producto] = await trx<{ id_producto: string }[]>(
    'SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE',
    [input.productoId]
  );
  if (!producto) throw new NotFoundError('Producto', input.productoId);

  const presentaciones = await trx<{ id: string; nombre: string }[]>(
    `SELECT id, nombre FROM inventario_presentaciones
      WHERE producto_id = ? AND id IN (?) FOR UPDATE`,
    [input.productoId, [input.presentacionOrigenId, input.presentacionDestinoId]]
  );
  if (presentaciones.length !== 2) throw new NotFoundError('Presentación del producto');

  const origen = presentaciones.find(item => item.id === input.presentacionOrigenId);
  const destino = presentaciones.find(item => item.id === input.presentacionDestinoId);
  if (!origen || !destino) throw new NotFoundError('Presentación del producto');
  if (!esPresentacionPendiente(origen.nombre)) {
    throw new ValidationError('La presentación de origen no está pendiente de confirmación');
  }
  if (esPresentacionPendiente(destino.nombre)) {
    throw new ValidationError('El destino debe ser una presentación confirmada');
  }

  const [transferenciaPendiente] = await trx<{ id: string }[]>(
    `SELECT id FROM inventario_movimientos
      WHERE tipo = 'traspaso' AND producto_id = ? AND presentacion_id = ?
        AND estado = 'pendiente'
      LIMIT 1 FOR UPDATE`,
    [input.productoId, input.presentacionOrigenId]
  );
  if (transferenciaPendiente) {
    throw new ConflictError('Recibe o cancela la transferencia pendiente antes de conciliar');
  }

  const unidades = await trx<{ id: string; codigo: string; codigo_barras: string | null }[]>(
    `SELECT id, codigo, codigo_barras FROM inventario_unidades
      WHERE producto_id = ? AND presentacion_id = ?
        AND estado = 'almacen' AND ubicacion = 'almacen'
        AND (codigo IN (?) OR codigo_barras IN (?))
      FOR UPDATE`,
    [input.productoId, input.presentacionOrigenId, input.codigosUnidades, input.codigosUnidades]
  );
  if (unidades.length !== input.codigosUnidades.length) {
    throw new ConflictError('No se encontraron todas las unidades seleccionadas en Bodega');
  }

  const actualizadas = await trx<{ id: string }[]>(
    `UPDATE inventario_unidades SET presentacion_id = ?
      WHERE producto_id = ? AND presentacion_id = ?
        AND estado = 'almacen' AND ubicacion = 'almacen' AND id IN (?)
      RETURNING id`,
    [
      input.presentacionDestinoId,
      input.productoId,
      input.presentacionOrigenId,
      unidades.map(u => u.id)
    ]
  );
  if (actualizadas.length !== unidades.length) {
    throw new ConflictError(
      'El stock cambió mientras se conciliaba; vuelve a escanear las unidades'
    );
  }
  return actualizadas.length;
}

export async function ejecutarReclasificacionStockPendiente(
  input: ReclasificarStockPendienteInput
): Promise<number> {
  return await withTransaction(async trx => await reclasificarUnidadesPendientes(trx, input));
}
