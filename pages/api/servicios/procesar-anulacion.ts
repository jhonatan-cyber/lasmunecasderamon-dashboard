import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
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
    // Buscar la solicitud por token
    const solicitudSql = `
      SELECT 
        sas.servicio_id,
        sas.estado,
        s.codigo,
        s.estado as servicio_estado,
        s.total,
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
    `;

    const solicitudResult = await query(solicitudSql, [token]);

    if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada o ya procesada',
        message: 'La solicitud de anulación no existe o ya fue procesada'
      });
    }

    const solicitud = solicitudResult[0] as any;

    const servicioId = solicitud.servicio_id;
    const codigoServicio = solicitud.codigo;
    const clienteNombre = solicitud.cliente_nombre || 'Sin cliente';
    const totalServicio = solicitud.total || 0;
    const habitacion = solicitud.habitacion_numero;
    const tiempo = solicitud.tiempo;
    const anfitrionas = solicitud.anfitrionas_nombres || 'Sin anfitriones';

    // Actualizar el estado de la solicitud
    const nuevoEstado = action === 'confirmar' ? 'confirmada' : 'rechazada';

    await query('UPDATE solicitudes_anulacion_servicios SET estado = ? WHERE token = ?', [
      nuevoEstado,
      token
    ]);

    if (action === 'confirmar') {
      // Si se confirma, cambiar el estado del servicio a anulado (3)

      await query('UPDATE servicios SET estado = 3, fecha_mod = NOW() WHERE id_servicio = ?', [
        servicioId
      ]);

      // Cambiar estado de comisiones asociadas al servicio

      try {
        // Actualizar el estado de las comisiones a 2 (anulado)
        await query(
          `
           UPDATE comisiones 
           SET estado = 2, fecha_mod = NOW()
           WHERE servicio_id = ?
         `,
          [servicioId]
        );
      } catch (comisionError) {
        console.error('🔍 API: Error actualizando estado de comisiones:', comisionError);
        // No fallar la operación si la actualización de comisiones falla
      }

      // Actualizar caja con los descuentos correspondientes

      try {
        // Obtener la caja actual (estado = 1)
        const cajaActualSql = `
           SELECT id_caja, efectivo, servicio, devolucion
           FROM cajas 
           WHERE estado = 1 
           ORDER BY fecha_apertura DESC 
           LIMIT 1
         `;
        const cajaActualResult = await query(cajaActualSql);
        const cajaActual = (
          Array.isArray(cajaActualResult) ? cajaActualResult[0] : cajaActualResult
        ) as any;

        if (cajaActual) {
          // Descontar el total del servicio del efectivo
          const nuevoEfectivo = Math.max(0, cajaActual.efectivo - totalServicio);
          // Descontar el total del servicio de la columna servicio
          const nuevoServicio = Math.max(0, cajaActual.servicio - totalServicio);
          // Sumar el total del servicio a la columna devolucion
          const nuevaDevolucion = (cajaActual.devolucion || 0) + totalServicio;

          await query(
            `UPDATE cajas 
              SET efectivo = ?, servicio = ?, devolucion = ?
              WHERE id_caja = ?`,
            [nuevoEfectivo, nuevoServicio, nuevaDevolucion, cajaActual.id_caja]
          );
        }
      } catch (cajaError) {
        console.error('🔍 API: Error actualizando caja:', cajaError);
        // No fallar la operación si la actualización de caja falla
      }

      // Enviar mensaje de confirmación por WhatsApp
      const mensajeConfirmacion = `✅ *ANULACIÓN DE SERVICIO CONFIRMADA*

El servicio con código *${codigoServicio}* ha sido anulado exitosamente.

📋 *Detalles:*
• Código: ${codigoServicio}
• Cliente: ${clienteNombre}
• Habitación: ${habitacion || 'No especificada'}
• Tiempo: ${tiempo || 'No especificado'} minutos
• Total: $${totalServicio?.toLocaleString() || 0}
• Anfitriones: ${anfitrionas}

El servicio ya no está activo en el sistema.`;

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

      try {
        await enviarWhatsApp(adminWhatsApp, mensajeConfirmacion);
      } catch (whatsappError) {
        console.error('🔍 API: Error enviando WhatsApp:', whatsappError);
        // No fallar la operación si WhatsApp falla
      }

      // Enviar notificación al sistema
      const notificationData = {
        id: servicioId,
        codigo: codigoServicio,
        cliente: clienteNombre,
        habitacion: habitacion,
        tiempo: tiempo,
        total: totalServicio,
        anfitrionas: anfitrionas,
        accion: 'anulacion_servicio_confirmada',
        timestamp: new Date().toISOString()
      };

      // Guardar notificación en la base de datos
      try {
        await query(
          `
          INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion)
          VALUES (?, ?, 0, NOW())
        `,
          ['anulacion_servicio_confirmada', JSON.stringify(notificationData)]
        );
      } catch (dbError) {
        console.error('🔔 Error guardando notificación en BD:', dbError);
      }

      try {
        sendNotificationToAll('anulacion_servicio_confirmada', notificationData);
      } catch (notificationError) {
        console.error('🔔 Error enviando notificación:', notificationError);
        // No fallar la operación si las notificaciones fallan
      }
    } else {
      // Si se rechaza, cambiar el estado del servicio de vuelta a activo (1)

      await query('UPDATE servicios SET estado = 1, fecha_mod = NOW() WHERE id_servicio = ?', [
        servicioId
      ]);

      // Enviar mensaje de rechazo por WhatsApp
      const mensajeRechazo = `❌ *ANULACIÓN DE SERVICIO RECHAZADA*

La solicitud de anulación para el servicio con código *${codigoServicio}* ha sido rechazada.

📋 *Detalles:*
• Código: ${codigoServicio}
• Cliente: ${clienteNombre}
• Habitación: ${habitacion || 'No especificada'}
• Tiempo: ${tiempo || 'No especificado'} minutos
• Total: $${totalServicio?.toLocaleString() || 0}
• Anfitriones: ${anfitrionas}

El servicio permanece activo en el sistema.`;

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

      try {
        await enviarWhatsApp(adminWhatsApp, mensajeRechazo);
      } catch (whatsappError) {
        console.error('🔍 API: Error enviando WhatsApp:', whatsappError);
        // No fallar la operación si WhatsApp falla
      }

      // Enviar notificación al sistema
      const notificationData = {
        id: servicioId,
        codigo: codigoServicio,
        cliente: clienteNombre,
        habitacion: habitacion,
        tiempo: tiempo,
        total: totalServicio,
        anfitrionas: anfitrionas,
        accion: 'anulacion_servicio_rechazada',
        timestamp: new Date().toISOString()
      };

      // Guardar notificación en la base de datos
      try {
        await query(
          `
          INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion)
          VALUES (?, ?, 0, NOW())
        `,
          ['anulacion_servicio_rechazada', JSON.stringify(notificationData)]
        );
      } catch (dbError) {
        console.error('🔔 Error guardando notificación en BD:', dbError);
      }

      try {
        sendNotificationToAll('anulacion_servicio_rechazada', notificationData);
      } catch (notificationError) {
        console.error('🔔 Error enviando notificación:', notificationError);
        // No fallar la operación si las notificaciones fallan
      }
    }

    return res.status(200).json({
      success: true,
      message:
        action === 'confirmar'
          ? 'Anulación de servicio confirmada exitosamente'
          : 'Anulación de servicio rechazada exitosamente',
      servicio: {
        id: servicioId,
        codigo: codigoServicio,
        cliente: clienteNombre,
        habitacion: habitacion,
        tiempo: tiempo,
        total: totalServicio,
        anfitrionas: anfitrionas,
        estado: action === 'confirmar' ? 3 : 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al procesar la anulación'
    });
  }
}

export default handler;
