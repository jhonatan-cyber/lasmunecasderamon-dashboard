import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, action } = req.body;

  if (!token || !action || !['confirmar', 'rechazar'].includes(action)) {
    return res.status(400).json({ error: 'Token y acción requeridos' });
  }

  try {
    const result = await withTransaction(async connection => {
      // Buscar la solicitud por token
      const solicitudSql = `
        SELECT 
          sas.servicio_id,
          sas.estado,
          s.codigo,
          s.estado as servicio_estado,
          s.total,
          s.metodo_pago,
          s.habitacion_id,
          s.cliente_id,
          CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
          h.nombre as habitacion_numero,
          s.tiempo,
          GROUP_CONCAT(u.nick SEPARATOR ', ') as anfitrionas_nombres
        FROM solicitudes_anulacion_servicios sas
        LEFT JOIN servicios s ON sas.servicio_id = s.id_servicio
        LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
        LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
        LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
        LEFT JOIN usuarios u ON ds.usuario_id = u.id_usuario
        WHERE sas.token = ? AND sas.estado = 'pendiente'
        GROUP BY sas.servicio_id
        FOR UPDATE
      `;

      const solicitudResult = (await connection(solicitudSql, [token])) as any[];

      if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const solicitud = solicitudResult[0];
      const servicioId = solicitud.servicio_id;
      const codigoServicio = solicitud.codigo;
      const clienteNombre = solicitud.cliente_nombre || 'Sin cliente';
      const totalServicio = solicitud.total || 0;
      const habitacionId = solicitud.habitacion_id;
      const habitacionNombre = solicitud.habitacion_numero;
      const tiempo = solicitud.tiempo;
      const anfitrionasNombres = solicitud.anfitrionas_nombres || 'Sin anfitriones';
      const metodoPago = solicitud.metodo_pago || 'efectivo';

      if (action === 'confirmar') {
        // 1. Cambiar el estado del servicio a anulado (0)
        await connection(
          'UPDATE servicios SET estado = 0, fecha_mod = NOW() WHERE id_servicio = ?',
          [servicioId]
        );

        const { generateUUID } = await import('@/lib/db');
        // 2. Registrar la DEVOLUCIÓN en las tablas específicas
        const devServId = generateUUID();
        await connection(
          'INSERT INTO devoluciones_servicios (id, servicio_id, pieza_id, cliente_id, total, fecha_crea) VALUES (?, ?, ?, ?, ?, NOW())',
          [devServId, servicioId, habitacionId || 0, solicitud.cliente_id || 0, totalServicio]
        );

        // Registrar detalles por anfitriona
        const anfitrionas = (await connection(
          'SELECT usuario_id, comision FROM detalle_servicios WHERE servicio_id = ?',
          [servicioId]
        )) as any[];
        for (const anf of anfitrionas) {
          const detDevId = generateUUID();
          await connection(
            'INSERT INTO detalle_devoluciones_servicios (id, devolucion_servicio_id, usuario_id, monto) VALUES (?, ?, ?, ?)',
            [detDevId, devServId, anf.usuario_id, anf.comision || 0]
          );
          // Liberar anfitriona
          await connection('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [anf.usuario_id]);
        }

        // 3. Liberar habitación si no es área libre
        if (habitacionId) {
          const roomInfo = (await connection(
            'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
            [habitacionId]
          )) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom =
              !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (!isFreeRoom) {
              await connection('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
                habitacionId
              ]);
            }
          }
        }

        // 4. Anular comisiones
        await connection(
          'UPDATE comisiones SET estado = 2, fecha_mod = NOW() WHERE servicio_id = ?',
          [servicioId]
        );

        // 5. Actualizar caja
        const cajaActualResult = (await connection(`
          SELECT id_caja, efectivo, tarjeta, transferencia, servicio, devolucion
          FROM cajas 
          WHERE estado = 1 
          ORDER BY fecha_apertura DESC 
          LIMIT 1
        `)) as any[];
        const cajaActual = cajaActualResult[0];

        if (cajaActual) {
          let columnToUpdate = 'efectivo';
          if (metodoPago === 'tarjeta') columnToUpdate = 'tarjeta';
          else if (metodoPago === 'transferencia') columnToUpdate = 'transferencia';

          await connection(
            `UPDATE cajas SET ${columnToUpdate} = GREATEST(0, ${columnToUpdate} - ?), servicio = GREATEST(0, servicio - ?), devolucion = devolucion + ? WHERE id_caja = ?`,
            [totalServicio, totalServicio, totalServicio, cajaActual.id_caja]
          );
        }

        await connection(
          "UPDATE solicitudes_anulacion_servicios SET estado = 'confirmada' WHERE token = ?",
          [token]
        );

        return {
          success: true,
          message: 'Anulación de servicio confirmada exitosamente',
          servicio: {
            id: servicioId,
            codigo: codigoServicio,
            cliente: clienteNombre,
            total: totalServicio,
            habitacion: habitacionNombre,
            habitacion_id: habitacionId,
            anfitrionas: anfitrionasNombres
          }
        };
      } else {
        // Rechazar
        await connection(
          'UPDATE servicios SET estado = 2, fecha_mod = NOW() WHERE id_servicio = ?',
          [servicioId]
        );
        await connection(
          "UPDATE solicitudes_anulacion_servicios SET estado = 'rechazada' WHERE token = ?",
          [token]
        );
        return {
          success: true,
          message: 'Anulación de servicio rechazada exitosamente',
          servicio: {
            id: servicioId,
            codigo: codigoServicio,
            cliente: clienteNombre,
            total: totalServicio,
            habitacion: habitacionNombre,
            anfitrionas: anfitrionasNombres
          }
        };
      }
    });

    // Notificaciones (fuera de la transacción)
    if (result.success) {
      const type =
        action === 'confirmar' ? 'anulacion_servicio_confirmada' : 'anulacion_servicio_rechazada';
      const notificationData = {
        ...result.servicio,
        accion: type,
        timestamp: new Date().toISOString()
      };

      try {
        await query(
          `INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion) VALUES (?, ?, 0, NOW())`,
          [type, JSON.stringify(notificationData)]
        );
        sendNotificationToAll(type, notificationData);
        if (action === 'confirmar') {
          sendNotificationToAll('timer_stopped', {
            servicioId: result.servicio.id,
            roomId: result.servicio.habitacion_id
          });
        }
      } catch (err) {
        console.error('Error enviando notificaciones:', err);
      }

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      const emoji = action === 'confirmar' ? '✅' : '❌';
      const titulo = action === 'confirmar' ? 'SERVICIO ANULADO' : 'ANULACIÓN RECHAZADA';
      const msg = `${emoji} *${titulo}*\n\nEl servicio con código *${result.servicio.codigo}* ha sido ${action === 'confirmar' ? 'anulado' : 'mantenido activo'}.\n\n📋 *Detalles:*\n• Cliente: ${result.servicio.cliente}\n• Habitación: ${result.servicio.habitacion}\n• Total: $${result.servicio.total?.toLocaleString()}`;
      await enviarWhatsApp(adminWhatsApp, msg);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error en procesar-anulacion servicios:', error);
    return res.status(error.message.includes('No encontrada') ? 404 : 500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}

export default handler;
