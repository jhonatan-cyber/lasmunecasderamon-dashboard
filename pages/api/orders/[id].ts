import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { sendNotificationToAll } from '../notifications/sse';
import { notifyOrderDeleted, notifyOrderProcessed } from './sse';

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Falta el id'
      });
    }

    // Solo permitir actualización de estado
    if (req.body.estado !== undefined) {
      // Validar que el estado sea válido (0, 1, o 2)
      if (![0, 1, 2].includes(req.body.estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Solo se permiten valores 0, 1, o 2'
        });
      }

      // Si se intenta procesar el pedido (estado = 0), validar que haya caja abierta
      if (req.body.estado === 0) {
        const cajaAbiertaResult = (await query(
          'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        )) as any[];

        if (!cajaAbiertaResult || cajaAbiertaResult.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No hay una caja abierta para procesar este pedido.'
          });
        }
      }

      await query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', [req.body.estado, id]);

      // Notificar a todos los clientes para actualizar contador en tiempo real
      sendNotificationToAll('order_updated', {
        id: Number(id),
        estado: req.body.estado
      });

      // Si el pedido fue procesado (estado = 0) -> marcar habitaciones asociadas como ocupadas
      // y emitir timer_started (si la habitación tiene tiempo) + notificar pedido procesado por SSE
      if (req.body.estado === 0) {
        try {
          const habitacionesRows = (await query(
            'SELECT DISTINCT habitacion_id FROM detalle_pedidos WHERE pedido_id = ? AND habitacion_id IS NOT NULL',
            [id]
          )) as any[];

          for (const row of habitacionesRows) {
            const roomId = row.habitacion_id;
            if (!roomId) continue;

            // Marcar habitación como ocupada en la base de datos si no es área libre
            try {
              const checkFreeRoom = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [roomId])) as any[];
              let isFreeRoom = false;
              if (checkFreeRoom.length > 0) {
                const room = checkFreeRoom[0];
                isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
              }
              if (!isFreeRoom) {
                await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [roomId]);
                console.info(
                  '[ORDERS PUT] Habitación marcada como ocupada (pedido procesado):',
                  roomId
                );
              } else {
                console.info('[ORDERS PUT] Habitación no ocupada porque es área libre:', roomId);
              }
            } catch (roomErr) {
              console.error('[ORDERS PUT] Error marcando habitación ocupada:', roomErr);
            }

            // Obtener datos de la habitación (nombre, tiempo)
            const roomInfo = (await query(
              'SELECT nombre, tiempo FROM habitaciones WHERE id_habitacion = ?',
              [roomId]
            )) as any[];
            const roomName = roomInfo?.[0]?.nombre || `Habitación ${roomId}`;
            const duration = Number(roomInfo?.[0]?.tiempo || 0);

            // Obtener nombre del cliente (si existe)
            const pedidoInfo = (await query('SELECT cliente_id FROM pedidos WHERE id_pedido = ?', [
              id
            ])) as any[];
            let clienteNombre = 'Sin cliente registrado';
            if (pedidoInfo?.[0]?.cliente_id) {
              const clienteRes = (await query(
                'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
                [pedidoInfo[0].cliente_id]
              )) as any[];
              if (clienteRes && clienteRes.length > 0) {
                clienteNombre = `${clienteRes[0].nombre} ${clienteRes[0].apellido || ''}`.trim();
              }
            }

            // Obtener anfitrionas asociadas al pedido (si las hay)
            const anfitrionasRes = (await query(
              `SELECT GROUP_CONCAT(u.nick SEPARATOR ', ') as anfitrionas
               FROM pedidos_usuarios pu
               INNER JOIN usuarios u ON pu.usuario_id = u.id_usuario
               WHERE pu.pedido_id = ?`,
              [id]
            )) as any[];
            const anfitrionas = anfitrionasRes?.[0]?.anfitrionas || '';

            // Emitir evento timer_started si la habitación tiene tiempo > 0
            if (duration > 0) {
              try {
                sendNotificationToAll('timer_started', {
                  servicioId: Number(id),
                  codigo: `PEDIDO_${id}`,
                  roomId: Number(roomId),
                  roomName,
                  duration,
                  startTime: new Date().toISOString(),
                  clienteNombre,
                  anfitrionas,
                  tipoTransaccion: 'pedido'
                });
                console.info('[ORDERS PUT] timer_started enviado para pedido', id, 'room', roomId);
              } catch (timerErr) {
                console.error('[ORDERS PUT] Error enviando timer_started:', timerErr);
              }
            } else {
              // Emitir evento room_occupied para sincronizar UI aunque no haya timer
              try {
                sendNotificationToAll('room_occupied', {
                  roomId: Number(roomId),
                  timestamp: new Date().toISOString()
                });
              } catch (roomNotifyErr) {
                console.error('[ORDERS PUT] Error enviando room_occupied:', roomNotifyErr);
              }
            }
          }

          // Notificar por SSE que el pedido fue procesado para cerrar modales / actualizar listas
          try {
            notifyOrderProcessed(Number(id));
          } catch (notifyErr) {
            console.error('[ORDERS PUT] Error notificando pedido procesado por SSE:', notifyErr);
          }
        } catch (procErr) {
          console.error(
            '[ORDERS PUT] Error procesando habitaciones al cambiar estado a procesado:',
            procErr
          );
        }
      }

      // Si el pedido fue rechazado (estado = 2), notificar por SSE para actualizar la lista
      if (req.body.estado === 2) {
        console.log(`[ORDERS] Pedido ${id} rechazado, notificando por SSE...`);
        try {
          notifyOrderDeleted(Number(id));
        } catch (sseError) {
          console.error('[ORDERS] Error notificando rechazo por SSE:', sseError);
        }
      }

      return res
        .status(200)
        .json({ success: true, message: 'Estado del pedido actualizado correctamente' });
    }

    // Si no se está actualizando el estado, retornar error
    return res.status(400).json({
      success: false,
      message: 'Solo se permite actualizar el estado del pedido'
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Error al actualizar el estado del pedido', error });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Falta el id del pedido'
      });
    }

    // Obtener información del pedido antes de eliminarlo (necesaria para notificaciones)
    const pedidoInfo = (await query('SELECT mesero_id FROM pedidos WHERE id_pedido = ?', [
      id
    ])) as any[];

    // Iniciar transacción para eliminar en orden correcto
    await rawQuery('START TRANSACTION');

    try {
      // Eliminar registros de anfitrionas específicas de productos (si existen)
      await query(
        `
        DELETE dpa FROM detalle_pedidos_anfitrionas dpa
        INNER JOIN detalle_pedidos dp ON dp.id_detalle_pedido = dpa.detalle_pedido_id
        WHERE dp.pedido_id = ?
      `,
        [id]
      );

      // Eliminar detalles del pedido
      await query('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);

      // Eliminar usuarios asociados al pedido
      await query('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);

      // Eliminar el pedido principal
      const result = await query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);

      // Verificar si se eliminó algún registro
      if ((result as any).affectedRows === 0) {
        await rawQuery('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      await rawQuery('COMMIT');

      // Notificar globalmente (channel /api/notifications/sse) para que clientes que solo escuchan el canal global se actualicen
      try {
        if (pedidoInfo && pedidoInfo.length > 0) {
          console.info('[ORDERS] sending order_deleted notification (global)', {
            id: Number(id),
            meseroId: pedidoInfo[0].mesero_id
          });
          sendNotificationToAll('order_deleted', {
            id: Number(id),
            meseroId: pedidoInfo[0].mesero_id,
            timestamp: new Date().toISOString()
          });
        } else {
          sendNotificationToAll('order_deleted', {
            id: Number(id),
            timestamp: new Date().toISOString()
          });
        }
      } catch (notifyErr) {
        console.error('[ORDERS] Error enviando notification global order_deleted:', notifyErr);
      }

      // Notificar por SSE para actualizar la lista de pedidos (canal específico)
      console.log(`[ORDERS] Pedido ${id} eliminado, notificando por SSE...`);
      try {
        notifyOrderDeleted(Number(id));
      } catch (sseError) {
        console.error('[ORDERS] Error notificando eliminación por SSE:', sseError);
      }

      return res.status(200).json({
        success: true,
        message: 'Pedido eliminado correctamente'
      });
    } catch (deleteError) {
      await rawQuery('ROLLBACK');
      throw deleteError;
    }
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el pedido',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'PUT':
      return await handlePut(req, res);
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      return res.status(405).json({
        success: false,
        message: `Método ${req.method} no permitido`
      });
  }
}
