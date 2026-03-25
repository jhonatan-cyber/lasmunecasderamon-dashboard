import { query, rawQuery, generateUUID, withTransaction } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { 
  applyAutoRoomToDetails, 
  hasSpecialHostessProducts 
} from '@/lib/orderRoomAssignment';
import { 
  buildOrderNotificationData,
  buildOrderDeletionNotificationData
} from '@/lib/orderNotificationUtils';
import { sendNotificationToAll } from '@/lib/sseService';
import { sendPushByRole } from '@/lib/pushNotifications';
import { buildOrderPushBody } from '@/lib/notificationMessages';

export class OrderRepository {
  static async getAll() {
    return await query(`
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
      WHERE P.estado = 1
      ORDER BY P.fecha_crea DESC
    `);
  }

  static async getByUser(userId: string) {
    return await query(`
      SELECT P.id_pedido, P.codigo, P.subtotal, P.total, P.estado, P.fecha_crea
      FROM pedidos P
      WHERE P.mesero_id = ?
      ORDER BY P.fecha_crea DESC
    `, [userId]);
  }

  static async create(data: any) {
    let { codigo, meseroId, clienteId, subtotal, total, totalComision, propina, detalles, usuarios, device_date } = data;

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

    await withTransaction(async (trx) => {
      await trx('INSERT INTO pedidos (id_pedido, codigo, mesero_id, cliente_id, subtotal, total, total_comision, propina, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pedidoId, codigo, meseroId, clienteId || null, subtotal, total, totalComision, propina || 0, 1, fechaCrea]);

      for (const d of detalles) {
        const detallePedidoId = generateUUID();
        await trx('INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id, habitacion_id, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [detallePedidoId, pedidoId, d.productoId, d.precio, d.comision, d.generaComision ?? 1, d.cantidad, d.subtotal, d.hostessId || null, d.roomId || null, fechaCrea]);

        if (d.selectedHostesses && d.selectedHostesses.length > 0) {
          for (const hostessId of d.selectedHostesses) {
            await trx('INSERT INTO detalle_pedidos_anfitrionas (id_detalle_anfitriona, detalle_pedido_id, anfitriona_id) VALUES (?, ?, ?)',
              [generateUUID(), detallePedidoId, hostessId]);
          }
        }
      }

      for (const u of usuarios) {
        await trx('INSERT INTO pedidos_usuarios (id_pedido_usuario, usuario_id, pedido_id) VALUES (?, ?, ?)', 
          [generateUUID(), u.usuarioId, pedidoId]);
      }
    });

    // Post-create logic: Room occupancy
    const roomIds = Array.from(new Set(detalles.map((d: any) => d.roomId).filter((r: any) => r)));
    for (const rid of roomIds) {
      const roomInfo = (await query<any[]>('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [rid]));
      if (roomInfo.length > 0) {
        const room = roomInfo[0];
        const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        if (!isFreeRoom) {
          await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [rid]);
          sendNotificationToAll('room_occupied', { roomId: rid, timestamp: new Date().toISOString() });
        }
      }
    }

    // Notifications
    const notificationData = await buildOrderNotificationData({ pedidoId, codigo, clienteId, meseroId, total });
    sendNotificationToAll('new_order', notificationData);

    const pushBody = buildOrderPushBody({ codigo, clienteNombre: notificationData.cliente, total });
    sendPushByRole('cajero', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });
    sendPushByRole('administrador', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });

    return { id: pedidoId, habitacion_auto_seleccionada: habitacionAutoSeleccionada, tiempo_auto_seleccionado: tiempoAutoSeleccionado };
  }

  static async delete(id: string) {
    const pedidoInfo = await query<any[]>('SELECT mesero_id FROM pedidos WHERE id_pedido = ?', [id]);
    
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
      await trx('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
      await trx('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
    });

    if (pedidoInfo.length > 0) {
      sendNotificationToAll('order_deleted', buildOrderDeletionNotificationData(id, String(pedidoInfo[0].mesero_id)));
    }
  }

  static async getDetail(id: string) {
    return await query(`
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
        PROD.nombre AS producto_nombre, PROD.categoria, DP.hostess_id, DP.habitacion_id
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      INNER JOIN detalle_pedidos DP ON DP.pedido_id = P.id_pedido
      INNER JOIN productos PROD ON PROD.id_producto = DP.producto_id
      WHERE P.id_pedido = ?
    `, [id]);
  }

  static async updateStatus(id: string, estado: number) {
    await query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', [estado, id]);
  }

  private static async buscarVentaActivaConHabitacion(anfitrionaId: string) {
    const result = await query<any[]>(`
      SELECT v.id_venta, v.habitacion_id, h.nombre as habitacion_nombre, v.tiempo, v.codigo
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id = ? AND v.habitacion_id IS NOT NULL AND v.tiempo > 0 AND v.estado = 2
      ORDER BY v.fecha_crea DESC LIMIT 1
    `, [anfitrionaId]);
    return result.length > 0 ? result[0] : null;
  }
}
