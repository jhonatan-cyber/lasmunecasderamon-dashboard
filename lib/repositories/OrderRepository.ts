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
        P.subtotal, P.total, P.estado, P.fecha_crea
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.estado IN (1, 2)
      ORDER BY P.fecha_crea DESC
      LIMIT ?
    `,
      [limit]
    );
    return results.map(row => this.mapOrderFromDB(row));
  }

  static async getByUser(userId: string): Promise<OrderType[]> {
    const results = await query<any[]>(
      `
      SELECT P.id_pedido, P.codigo, P.subtotal, P.total, P.estado, P.fecha_crea
      FROM pedidos P
      WHERE P.mesero_id = ?
      ORDER BY P.fecha_crea DESC
    `,
      [userId]
    );
    return results.map(row => this.mapOrderFromDB(row));
  }

  static async create(body: OrderCreateInput): Promise<any> {
    const data = OrderCreateSchema.parse(body);
    let {
      codigo,
      meseroId,
      clienteId,
      subtotal,
      total,
      totalComision,
      propina,
      detalles,
      usuarios,
      device_date
    } = data;

    const tieneProductosEspeciales = hasSpecialHostessProducts(detalles);
    let habitacionAutoSeleccionada: string | null = null;
    let tiempoAutoSeleccionado: number | null = null;

    if (tieneProductosEspeciales && usuarios && usuarios.length > 0) {
      for (const usuario of usuarios) {
        const ventaActiva = await this.buscarVentaActivaConHabitacion(usuario.usuarioId);
        if (ventaActiva) {
          habitacionAutoSeleccionada = ventaActiva.habitacion_id;
          tiempoAutoSeleccionado = ventaActiva.tiempo;
          break;
        }
      }
    }

    if (habitacionAutoSeleccionada) {
      detalles = applyAutoRoomToDetails(detalles, habitacionAutoSeleccionada);
    }

    const pedidoId = generateUUID();
    const fechaCrea = getNowInBusinessTimezone(device_date || undefined);

    await withTransaction(async trx => {
      await BaseRepository.insert(trx, 'pedidos', {
        id_pedido: pedidoId,
        codigo,
        mesero_id: meseroId,
        cliente_id: clienteId || null,
        subtotal,
        total,
        total_comision: totalComision,
        propina,
        estado: 1,
        fecha_crea: fechaCrea
      });

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
            // detalle_pedidos_anfitrionas utiliza IDs incrementales (int), pero el sistema usa UUIDs.
            // Para evitar errores de inserción, solo registramos en pedidos_usuarios que sí soporta UUIDs.
          }
        }
      }

      for (const u of usuarios) {
        await BaseRepository.insert(trx, 'pedidos_usuarios', {
          id_pedido_usuario: generateUUID(),
          usuario_id: u.usuarioId,
          pedido_id: pedidoId
        });
      }
    });

    const roomIds = Array.from(new Set(detalles.map((d: any) => d.roomId).filter((r: any) => r)));
    for (const rid of roomIds as string[]) {
      const room = await BaseRepository.findOne<any>(query, 'habitaciones', 'id_habitacion', rid);
      if (room) {
        const isFreeRoom =
          !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        if (!isFreeRoom) {
          await BaseRepository.update(query, 'habitaciones', 'id_habitacion', rid, { estado: 2 });
          sendNotificationToAll('room_occupied', {
            roomId: rid,
            timestamp: getNowInBusinessTimezone()
          });
        }
      }
    }

    const notificationData = await buildOrderNotificationData({
      pedidoId,
      codigo,
      clienteId: clienteId || '',
      meseroId,
      total
    });
    sendNotificationToAll('new_order', notificationData);

    const pushBody = buildOrderPushBody({ codigo, clienteNombre: notificationData.cliente, total });
    sendPushByRole('cajero', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });
    sendPushByRole('administrador', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });

    return {
      id: pedidoId,
      habitacion_auto_seleccionada: habitacionAutoSeleccionada,
      tiempo_auto_seleccionado: tiempoAutoSeleccionado
    };
  }

  static async delete(id: string): Promise<void> {
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
  }

  static async getDetail(id: string): Promise<any[]> {
    return await query<any[]>(
      `
      SELECT 
        P.id_pedido, P.codigo, P.fecha_crea, P.subtotal, P.total, P.propina,
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente,
        P.cliente_id,
        CONCAT(U.nombre, ' ', U.apellido) AS garzon,
        (SELECT GROUP_CONCAT(CONCAT(U2.nombre, ' ', U2.apellido) SEPARATOR ', ') 
         FROM pedidos_usuarios PU 
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
         WHERE PU.pedido_id = P.id_pedido) AS anfitriona,
        (SELECT GROUP_CONCAT(U2.id_usuario SEPARATOR ',') 
         FROM pedidos_usuarios PU 
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id 
         WHERE PU.pedido_id = P.id_pedido) AS anfitrionaIds,
        DP.producto_id, DP.precio, DP.cantidad, DP.comision, DP.subtotal AS subtotal_detalle,
        PROD.nombre AS producto_nombre, DP.hostess_id, DP.habitacion_id
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      INNER JOIN detalle_pedidos DP ON DP.pedido_id = P.id_pedido
      INNER JOIN productos PROD ON PROD.id_producto = DP.producto_id
      WHERE P.id_pedido = ?
    `,
      [id]
    );
  }

  static async updateStatus(id: string, estado: number): Promise<OrderType | null> {
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
        P.subtotal, P.total, P.estado, P.fecha_crea
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.id_pedido = ?
    `,
      [id]
    );

    return results.length > 0 ? this.mapOrderFromDB(results[0]) : null;
  }

  private static async buscarVentaActivaConHabitacion(anfitrionaId: string): Promise<any> {
    const result = await query<any[]>(
      `
      SELECT v.id_venta, v.habitacion_id, h.nombre as habitacion_nombre, v.tiempo, v.codigo
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id = ? AND v.habitacion_id IS NOT NULL AND v.tiempo > 0 AND v.estado = 2
      ORDER BY v.fecha_crea DESC LIMIT 1
    `,
      [anfitrionaId]
    );
    return result.length > 0 ? result[0] : null;
  }
}
