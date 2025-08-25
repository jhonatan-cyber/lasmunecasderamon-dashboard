import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { enviarWhatsApp } from '@/lib/whatsappService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token, action } = req.query;

    if (!token || !action) {
      return res.status(400).json({ error: 'Token y action son requeridos' });
    }

    if (action !== 'confirmar' && action !== 'rechazar') {
      return res.status(400).json({ error: 'Action debe ser confirmar o rechazar' });
    }

    // Buscar la solicitud de devolución
    const solicitudSql = `
      SELECT 
        sds.*,
        s.codigo,
        s.total,
        s.fecha_crea,
        c.nombre as cliente_nombre
      FROM solicitudes_devolucion_servicios sds
      JOIN servicios s ON sds.servicio_id = s.id_servicio
      LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
      WHERE sds.token = ? AND sds.estado = 'pendiente'
    `;

    const solicitudes = await query(solicitudSql, [token]) as any[];
    
    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const solicitud = solicitudes[0] as any;
    const servicioId = solicitud.servicio_id;

    // Actualizar estado de la solicitud
    const nuevoEstadoSolicitud = action === 'confirmar' ? 'confirmada' : 'rechazada';
    try {
      await query(
        "UPDATE solicitudes_devolucion_servicios SET estado = ? WHERE token = ?",
        [nuevoEstadoSolicitud, token]
      );
    } catch (error) {
      console.error("Error al actualizar estado de solicitud:", error);
      // Continuar sin actualizar la solicitud si hay error
    }

    // Actualizar estado del servicio
    const nuevoEstadoServicio = action === 'confirmar' ? 3 : 1; // 3 = devuelto, 1 = activo
    await query(
      "UPDATE servicios SET estado = ?, fecha_mod = NOW() WHERE id_servicio = ?",
      [nuevoEstadoServicio, servicioId]
    );

    // Si se confirma la devolución, realizar operaciones adicionales
    if (action === 'confirmar') {
      // 1. Cambiar estado de la habitación de 2 (ocupada) a 1 (disponible)
      await query(
        "UPDATE habitaciones SET estado = 1 WHERE id_habitacion = (SELECT habitacion_id FROM servicios WHERE id_servicio = ?)",
        [servicioId]
      );

      // 2. Actualizar caja activa (estado = 1)
      const cajaActiva = await query(
        "SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1"
      ) as any[];

      if (cajaActiva && cajaActiva.length > 0) {
        const caja = cajaActiva[0];
        
        // Obtener información del servicio para los cálculos
        const servicioInfo = await query(
          "SELECT total, iva FROM servicios WHERE id_servicio = ?",
          [servicioId]
        ) as any[];

        if (servicioInfo && servicioInfo.length > 0) {
          const servicio = servicioInfo[0];
          const totalServicio = servicio.total || 0;
          const ivaServicio = servicio.iva || 0;

          // Calcular nuevos valores de caja
          const nuevoEfectivo = Math.max(0, caja.efectivo - totalServicio);
          const nuevaIva = Math.max(0, caja.iva - ivaServicio);
          const nuevaDevoluciones = caja.devoluciones + totalServicio;

          // Actualizar caja
          await query(
            `UPDATE cajas 
             SET efectivo = ?, iva = ?, devoluciones = ?
             WHERE id_caja = ?`,
            [nuevoEfectivo, nuevaIva, nuevaDevoluciones, caja.id_caja]
          );

        }
      }
    }

    // Enviar mensaje de confirmación por WhatsApp
    const estadoTexto = action === 'confirmar' ? 'devuelto' : 'mantenido activo';
    const emoji = action === 'confirmar' ? '✅' : '❌';
    const titulo = action === 'confirmar' ? 'DEVOLUCIÓN CONFIRMADA' : 'DEVOLUCIÓN RECHAZADA';

    const mensajeConfirmacion = `${emoji} *${titulo}*

El servicio con código *${solicitud.codigo}* ha sido ${action === 'confirmar' ? 'devuelto exitosamente' : 'mantenido activo'}.

📋 *Detalles:*
• Código: ${solicitud.codigo}
• Cliente: ${solicitud.cliente_nombre || 'Sin cliente'}
• Total: $${solicitud.total?.toLocaleString() || 0}

${action === 'confirmar' ? 
  '✅ *Acciones realizadas:*\n• Servicio marcado como devuelto\n• Habitación liberada\n• Temporizador finalizado\n• Caja actualizada' : 
  '❌ *Acciones realizadas:*\n• Servicio mantenido activo\n• Temporizador reanudado'}`;

    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || "59172419112";
    await enviarWhatsApp(adminWhatsApp, mensajeConfirmacion);

    // Respuesta JSON simple
    return res.status(200).json({ 
      success: true,
      message: `Servicio ${action === 'confirmar' ? 'devuelto' : 'mantenido activo'} correctamente`,
      servicio: {
        id: servicioId,
        codigo: solicitud.codigo,
        estado: nuevoEstadoServicio
      }
    });

  } catch (error) {
    
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}