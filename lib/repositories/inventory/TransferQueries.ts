/**
 * Transferencias pendientes entre almacén y bar: aceptar y rechazar. Igual que la barra,
 * el rechazo recalcula el stock del producto.
 */
import { query, withTransaction } from '@/lib/database/db';
import { resolverBotella, completarOpciones } from './inventoryHelpers';
import { getTopeSimple } from './inventoryConfig';
import { ESTADO_UNIDAD_ACTIVA } from './inventoryHelpers';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { BaseRepository } from '../BaseRepository';
import type { Queryable } from './inventoryTypes';
import { UnidadQueries } from './UnidadQueries';

export class TransferQueries {
  static async acceptTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    const receivers = await trx<any[]>(
      `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
      [usuarioId]
    );
    if (!receivers.length)
      throw new BusinessError('Solo el encargado del bar (Barman) puede aceptar la transferencia');
    const lookup = await trx<any[]>(
      "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
      [id]
    );
    if (!lookup.length) throw new NotFoundError('Transferencia', id);
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      lookup[0].producto_id
    ]);
    const movements = await trx<any[]>(
      "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
      [id]
    );
    const movement = movements[0];
    if (!movement || movement.estado !== 'pendiente')
      throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
    if (movement.usuario_id === usuarioId)
      throw new BusinessError('La recepción debe confirmarla una persona distinta de quien envió');
    const units = await trx<any[]>(
      `SELECT id FROM inventario_unidades WHERE transferencia_id = ? AND ubicacion = 'transito'
       AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND producto_id = ? AND presentacion_id = ? FOR UPDATE`,
      [id, movement.producto_id, movement.presentacion_id]
    );
    if (units.length !== Number(movement.cantidad))
      throw new BusinessError('Las unidades reservadas no coinciden con la cantidad enviada');
    await trx(
      "UPDATE inventario_unidades SET ubicacion = 'bar', transferencia_id = NULL WHERE transferencia_id = ?",
      [id]
    );
    await BaseRepository.update(trx, 'inventario_presentaciones', 'id', movement.presentacion_id, {
      opciones_venta: JSON.stringify(movement.opciones_venta),
      precio_venta: movement.precio_venta,
      comision: movement.comision
    });
    await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
      estado: 'aceptada',
      aceptado_por: usuarioId,
      fecha_aceptacion: getNowInBusinessTimezone()
    });
  }

  static async acceptTransferStandalone(id: string, usuarioId: string): Promise<void> {
    await withTransaction(trx => this.acceptTransfer(trx, id, usuarioId));
    sendNotificationToAll('transfers_updated', { action: 'accepted', id });
  }

  static async rejectTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    const resolvers = await trx<any[]>(
      `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
      [usuarioId]
    );
    if (!resolvers.length)
      throw new BusinessError('Solo el encargado del bar (Barman) puede rechazar la transferencia');
    const lookup = await trx<any[]>(
      "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
      [id]
    );
    if (!lookup.length) throw new NotFoundError('Transferencia', id);
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      lookup[0].producto_id
    ]);
    const movements = await trx<any[]>(
      "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
      [id]
    );
    const movement = movements[0];
    if (!movement) throw new NotFoundError('Transferencia', id);
    if (movement.estado !== 'pendiente')
      throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
    await trx(
      "UPDATE inventario_unidades SET ubicacion = 'almacen', transferencia_id = NULL WHERE transferencia_id = ?",
      [id]
    );
    await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
      estado: 'rechazada',
      aceptado_por: usuarioId,
      fecha_aceptacion: getNowInBusinessTimezone()
    });
    await UnidadQueries.syncStockTotal(trx, movement.producto_id);
  }

  static async rejectTransferStandalone(id: string, usuarioId: string): Promise<void> {
    await withTransaction(trx => this.rejectTransfer(trx, id, usuarioId));
    sendNotificationToAll('transfers_updated', { action: 'rejected', id });
  }

  /** Mapa producto_id → max_anfitrionas. Vacío si la columna aún no existe (migración 017 pendiente). */

  static async listTransfers(pendingOnly = false) {
    const rows = await query<any[]>(
      `SELECT m.id, m.producto_id, m.cantidad, m.fecha_crea, m.precio_venta, m.comision, m.opciones_venta, m.estado, m.usuario_id, m.aceptado_por, m.fecha_aceptacion,
        COALESCE(p.nombre, 'Producto eliminado') AS producto_nombre,
        COALESCE(pr.nombre, 'Presentación eliminada') AS presentacion_nombre,
        COALESCE(u.nick, 'Sin usuario') AS usuario_nombre,
        receptor.nick AS aceptado_nombre,
        c.nombre AS categoria_nombre,
        pr.precio_venta AS pres_precio, pr.comision AS pres_comision,
        p.precio AS producto_precio, p.comision AS producto_comision, p.ml_shot,
        p.ml_shot_anfitriona
       FROM inventario_movimientos m
       LEFT JOIN productos p ON p.id_producto = m.producto_id
       LEFT JOIN inventario_presentaciones pr ON pr.id = m.presentacion_id
       LEFT JOIN categorias c ON c.id_categoria = p.categoria_id
       LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
       LEFT JOIN usuarios receptor ON receptor.id_usuario = m.aceptado_por
        WHERE m.tipo = 'traspaso' ${pendingOnly ? "AND m.estado = 'pendiente'" : ''}
        ORDER BY (m.estado = 'pendiente') DESC, m.fecha_crea DESC, m.id DESC ${pendingOnly ? '' : 'LIMIT 100'}`,
      []
    );
    const topeSimple = await getTopeSimple();
    return rows.map(row => ({
      ...row,
      opciones_venta:
        completarOpciones(
          row.opciones_venta,
          [
            { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
            { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
            {
              precio: Number(row.producto_precio ?? 0),
              comision: Number(row.producto_comision ?? 0)
            }
          ],
          topeSimple
        ) ??
        (row.precio_venta !== null && row.precio_venta !== undefined
          ? [
              resolverBotella(
                { precio: 0, comision: 0 },
                [
                  {
                    precio: Number(row.precio_venta ?? 0),
                    comision: Number(row.comision ?? 0)
                  }
                ],
                topeSimple
              )
            ]
          : undefined)
    })) as import('@/types/transfer').TransferRecord[];
  }
}
