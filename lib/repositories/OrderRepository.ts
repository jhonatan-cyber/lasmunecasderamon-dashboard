import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import {
  OrderSchema,
  OrderCreateSchema,
  type OrderType,
  type OrderCreateType
} from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import {
  applyAutoRoomToDetails,
  hasSpecialHostessProducts
} from '@/lib/business/orderRoomAssignment';
import {
  buildOrderNotificationData,
  buildOrderDeletionNotificationData
} from '@/lib/notifications/orderNotificationUtils';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/lib/integrations/pushNotifications';
import { buildOrderPushBody } from '@/lib/notifications/notificationMessages';
import { BaseRepository } from './BaseRepository';
import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

type OrderCreateInput = z.input<typeof OrderCreateSchema>;

export class OrderRepository {
  private static mapOrderFromDB(row: any): OrderType {
    return OrderSchema.parse({
      id: row.id_pedido,
      codigo: row.codigo,
      mesero_id: row.mesero_id,
      cliente_id: row.cliente_id,
      subtotal: row.subtotal,
      total: row.total,
      total_comision: row.total_comision,
      propina: row.propina,
      estado: row.estado,
      fecha_crea: row.fecha_crea,
      cliente_nombre: row.cliente || row.cliente_nombre,
      mesero_nombre: row.garzon || row.mesero_nombre,
      mesero_nick: row.garzon_nick,
      nicks: row.nicks || null
    });
  }

  static async getAll(limit: number = 200): Promise<OrderType[]> {
    try {
      const results = await query<any[]>(
        `SELECT P.id_pedido, COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente, P.codigo, CONCAT(U.nombre, ' ', U.apellido) AS garzon, U.nick as garzon_nick, (SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ') FROM pedidos_usuarios PU INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id WHERE PU.pedido_id = P.id_pedido) AS nicks, P.subtotal, (COALESCE(P.total, 0) + COALESCE(P.propina, 0)) AS total, P.propina, P.estado, P.fecha_crea FROM pedidos P LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id WHERE P.estado IN (1, 2) ORDER BY P.fecha_crea DESC LIMIT ?`,
        [limit]
      );
      return results.map(row => this.mapOrderFromDB(row));
    } catch (err) {
      logger.error('[OrderRepository] Error en getAll:', { err });
      throw new DatabaseError('Error al obtener lista de pedidos', err);
    }
  }

  static async getByUser(userId: string): Promise<OrderType[]> {
    try {
      const results = await query<any[]>(
        `
      SELECT 
        P.id_pedido, 
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente, 
        P.codigo, 
        CONCAT(U.nombre, ' ', U.apellido) AS garzon,
        U.nick as garzon_nick,
        (SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ') 
         FROM pedidos_usuarios PU 
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
         WHERE PU.pedido_id = P.id_pedido) AS nicks,
        P.subtotal, (COALESCE(P.total, 0) + COALESCE(P.propina, 0)) AS total, P.propina, P.estado, P.fecha_crea
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.mesero_id = ?
      ORDER BY P.fecha_crea DESC
    `,
        [userId]
      );
      return results.map(row => this.mapOrderFromDB(row));
    } catch (err) {
      logger.error('[OrderRepository] Error en getByUser:', { userId, err });
      throw new DatabaseError(`Error al obtener pedidos del usuario ${userId}`, err);
    }
  }

  static async create(body: OrderCreateInput): Promise<any> {
    try {
      const data = OrderCreateSchema.parse(body);
      let {
        codigo,
        meseroId,
        clienteId,
        subtotal,
        total,
        totalComision,
        propina,
        detalles: rawDetalles,
        usuarios,
        device_date
      } = data;

      // Normalizar selectedHostesses de string[] (Zod) a number[] (app types OrderDetail[])
      let detalles: Array<{
        productoId: string;
        precio: number;
        comision: number;
        generaComision: number;
        cantidad: number;
        subtotal: number;
        hostessId: string | null;
        roomId: string | null;
        selectedHostesses: number[];
      }> = rawDetalles.map(d => ({
        ...d,
        hostessId: d.hostessId ?? null,
        roomId: d.roomId ?? null,
        selectedHostesses: (d.selectedHostesses || []).map((s: string) => Number(s))
      }));

      const subtotalNormalizado = Number(subtotal || 0);
      const propinaNormalizada = Number(propina || 0);
      const totalFinal = Number(total || 0);
      const totalBasePedido =
        totalFinal > subtotalNormalizado + propinaNormalizada ? totalFinal - propinaNormalizada : subtotalNormalizado;

      const tieneProductosEspeciales = hasSpecialHostessProducts(detalles);
      let habitacionAutoSeleccionada: string | null = null;
      let tiempoAutoSeleccionado: number | null = null;

      if (tieneProductosEspeciales && usuarios && usuarios.length > 0) {
        const userIds = usuarios.map(u => String(u.usuarioId));
        // OPTIMIZACIÓN: Single query con IN + subquery (antes N queries en loop)
        const ventasActivas = await OrderRepository.buscarVentasActivasConHabitacion(userIds);
        if (ventasActivas.length > 0) {
          const ventasMap = new Map(ventasActivas.map(v => [v.usuario_id, v]));
          for (const usuario of usuarios) {
            const match = ventasMap.get(usuario.usuarioId);
            if (match) {
              habitacionAutoSeleccionada = match.habitacion_id;
              tiempoAutoSeleccionado = match.tiempo;
              break;
            }
          }
        }
      }

      if (habitacionAutoSeleccionada) {
        const roomAssigned = applyAutoRoomToDetails(detalles, habitacionAutoSeleccionada);
        detalles = roomAssigned.map(d => ({
          ...d,
          hostessId: d.hostessId ?? null,
          roomId: d.roomId ?? null
        }));
      }

      const pedidoId = generateUUID();
      const fechaCrea = getNowInBusinessTimezone(device_date || undefined);

      await withTransaction(async trx => {
        await BaseRepository.insert(trx, 'pedidos', {
          id_pedido: pedidoId,
          codigo,
          mesero_id: meseroId,
          cliente_id: clienteId || null,
          subtotal: totalBasePedido,
          total: totalBasePedido,
          total_comision: totalComision,
          propina: propinaNormalizada,
          estado: 1,
          fecha_crea: fechaCrea
        });

        // OPTIMIZACIÓN: Batch coletor para detalle_pedidos_anfitrionas
        const detalleAnfitrionaRows: Array<Record<string, unknown>> = [];

        for (const d of detalles) {
          const detallePedidoId = generateUUID();
          await BaseRepository.insert(trx, 'detalle_pedidos', {
            id_detalle_pedido: detallePedidoId,
            pedido_id: pedidoId,
            producto_id: d.productoId,
            precio: d.precio,
            comision: d.comision,
            genera_comision: d.generaComision,
            cantidad: d.cantidad,
            subtotal: d.subtotal,
            hostess_id: d.hostessId || null,
            habitacion_id: d.roomId || null,
            fecha_crea: fechaCrea
          });

          if (d.selectedHostesses && d.selectedHostesses.length > 0) {
            for (const hostessId of d.selectedHostesses) {
              detalleAnfitrionaRows.push({
                id_detalle_anfitriona: generateUUID(),
                detalle_pedido_id: detallePedidoId,
                anfitriona_id: String(hostessId),
                fecha_crea: fechaCrea
              });
            }
          }
        }

        // Batch insert detalle_pedidos_anfitrionas (antes D×H queries)
        if (detalleAnfitrionaRows.length > 0) {
          const columns = ['id_detalle_anfitriona', 'detalle_pedido_id', 'anfitriona_id', 'fecha_crea'];
          const placeholders = detalleAnfitrionaRows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
          const values = detalleAnfitrionaRows.flatMap(row => columns.map(col => row[col]));
          await trx(
            `INSERT INTO detalle_pedidos_anfitrionas (${columns.join(', ')}) VALUES ${placeholders}`,
            values
          );
        }

        // OPTIMIZACIÓN: Batch insert pedidos_usuarios (antes U queries)
        if (usuarios.length > 0) {
          const cols = ['id_pedido_usuario', 'usuario_id', 'pedido_id'];
          const usuarioRows = usuarios.map(u => ({
            id_pedido_usuario: generateUUID(),
            usuario_id: u.usuarioId,
            pedido_id: pedidoId
          }));
          const ph = usuarioRows.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
          const vals = usuarioRows.flatMap(row => cols.map(col => row[col as keyof typeof row]));
          await trx(
            `INSERT INTO pedidos_usuarios (${cols.join(', ')}) VALUES ${ph}`,
            vals
          );
        }
      });

      const notificationData = await buildOrderNotificationData({
        pedidoId,
        codigo,
        clienteId: clienteId || '',
        meseroId,
        total: totalBasePedido + propinaNormalizada
      });
      sendNotificationToAll('new_order', notificationData);

      const pushBody = buildOrderPushBody({
        codigo,
        clienteNombre: notificationData.cliente,
        total: totalBasePedido + propinaNormalizada
      });
      sendPushByRole('cajero', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });
      sendPushByRole('administrador', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });

      return {
        id: pedidoId,
        habitacion_auto_seleccionada: habitacionAutoSeleccionada,
        tiempo_auto_seleccionado: tiempoAutoSeleccionado
      };
    } catch (err) {
      if (err instanceof z.ZodError) throw err;
      logger.error('[OrderRepository] Error en create:', { codigo: body.codigo, err });
      throw new DatabaseError('Error al crear pedido', err);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const pedido = await BaseRepository.findOne<any>(query, 'pedidos', 'id_pedido', id);
      if (!pedido) return;

      await withTransaction(async trx => {
        await trx('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
        await trx('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
        await BaseRepository.delete(trx, 'pedidos', 'id_pedido', id);
      });

      sendNotificationToAll(
        'order_deleted',
        buildOrderDeletionNotificationData(id, String(pedido.mesero_id))
      );
    } catch (err) {
      logger.error('[OrderRepository] Error en delete:', { id, err });
      throw new DatabaseError(`Error al eliminar pedido ${id}`, err);
    }
  }

  static async getDetail(id: string): Promise<any[]> {
    try {
      return await query<any[]>(
        `
      SELECT 
        P.id_pedido, P.codigo, P.fecha_crea, P.subtotal, P.total, P.propina, P.total_comision,
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente,
        P.cliente_id,
        CONCAT(U.nombre, ' ', U.apellido) AS garzon,
        (SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ') 
           FROM pedidos_usuarios PU 
           INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
          WHERE PU.pedido_id = P.id_pedido) AS anfitriona,
        (SELECT GROUP_CONCAT(U2.id_usuario SEPARATOR ',') 
         FROM pedidos_usuarios PU 
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
         WHERE PU.pedido_id = P.id_pedido) AS anfitrionaIds,
        DP.producto_id, DP.precio, DP.cantidad, DP.comision, DP.subtotal AS subtotal_detalle,
        DP.genera_comision, PROD.nombre AS producto_nombre, C.nombre AS categoria, DP.hostess_id, DP.habitacion_id
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      INNER JOIN detalle_pedidos DP ON DP.pedido_id = P.id_pedido
      INNER JOIN productos PROD ON PROD.id_producto = DP.producto_id
      LEFT JOIN categorias C ON C.id_categoria = PROD.categoria_id
      WHERE P.id_pedido = ?
    `,
        [id]
      );
    } catch (err) {
      logger.error('[OrderRepository] Error en getDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle del pedido ${id}`, err);
    }
  }

  static async updateStatus(id: string, estado: number): Promise<OrderType | null> {
    try {
      await BaseRepository.update(query, 'pedidos', 'id_pedido', id, { estado });

      const results = await query<any[]>(
        `
      SELECT 
        P.id_pedido, 
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente, 
        P.codigo, 
        CONCAT(U.nombre, ' ', U.apellido) AS garzon,
        (SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ') 
         FROM pedidos_usuarios PU 
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
         WHERE PU.pedido_id = P.id_pedido) AS nicks,
        P.subtotal, (COALESCE(P.total, 0) + COALESCE(P.propina, 0)) AS total, P.propina, P.estado, P.fecha_crea
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.id_pedido = ?
    `,
        [id]
      );

      return results.length > 0 ? this.mapOrderFromDB(results[0]) : null;
    } catch (err) {
      logger.error('[OrderRepository] Error en updateStatus:', { id, err });
      throw new DatabaseError(`Error al actualizar estado del pedido ${id}`, err);
    }
  }

  // OPTIMIZACIÓN: Single query con IN + subquery (antes N queries en loop)
  private static async buscarVentasActivasConHabitacion(anfitrionasIds: string[]): Promise<any[]> {
    try {
      if (!anfitrionasIds.length) return [];
      const placeholders = anfitrionasIds.map(() => '?').join(', ');
      return await query<any[]>(
        `SELECT vu.usuario_id, v.id_venta, v.habitacion_id, h.nombre as habitacion_nombre, v.tiempo, v.codigo
       FROM ventas v
       INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
       INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
       WHERE vu.usuario_id IN (${placeholders})
         AND v.habitacion_id IS NOT NULL AND v.tiempo > 0 AND v.estado = 2
         AND v.fecha_crea = (
           SELECT MAX(v2.fecha_crea) FROM ventas v2
           INNER JOIN ventas_usuarios vu2 ON v2.id_venta = vu2.venta_id
           WHERE vu2.usuario_id = vu.usuario_id
             AND v2.habitacion_id IS NOT NULL AND v2.tiempo > 0 AND v.estado = 2
         )
       ORDER BY v.fecha_crea DESC`,
        anfitrionasIds
      );
    } catch (err) {
      logger.error('[OrderRepository] Error en buscarVentasActivasConHabitacion:', { err });
      throw new DatabaseError('Error al buscar ventas activas con habitación', err);
    }
  }
}
