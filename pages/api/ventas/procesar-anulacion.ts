import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token, action } = req.body;

    if (!token || !action) {
      return res.status(400).json({ error: 'Token y acción requeridos' });
    }

    // Buscar la solicitud por token
    const solicitudSql = `
      SELECT 
        sa.*,
        v.codigo,
        v.total,
        CONCAT(c.nombre, " ", c.apellido) as cliente_nombre
      FROM solicitudes_anulacion sa
      LEFT JOIN ventas v ON sa.venta_id = v.id_venta
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      WHERE sa.token = ? AND sa.estado = 'pendiente'
    `;

    const solicitudResult = await query(solicitudSql, [token]);
    
    if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
      return res.status(404).json({ 
        error: 'Solicitud no encontrada o ya procesada',
        message: 'Esta solicitud de anulación ya fue procesada o no existe.'
      });
    }

    const solicitud = solicitudResult[0] as any;
    const ventaId = solicitud.venta_id;
    const codigoVenta = solicitud.codigo;
    const clienteNombre = solicitud.cliente_nombre;
    const totalVenta = solicitud.total;

    if (action === 'confirmar') {
      console.log('🔍 Confirmando anulación para venta ID:', ventaId);
      
      // Obtener detalles de la venta para calcular descuentos en caja
      const detallesSql = `
        SELECT 
          SUM(dv.comision) as total_comision,
          SUM(dv.sub_total) as total_sub_total
        FROM detalle_ventas dv
        WHERE dv.venta_id = ?
      `;
      const detallesResult = await query(detallesSql, [ventaId]);
      const detalles = (Array.isArray(detallesResult) ? detallesResult[0] : detallesResult) as any;
      
      const totalComision = detalles?.total_comision || 0;
      const totalSubTotal = detalles?.total_sub_total || 0;
      
      console.log('🔍 Detalles obtenidos:', { totalComision, totalSubTotal });

      // Obtener información de la venta para la propina
      const ventaSql = `
        SELECT total, propina
        FROM ventas
        WHERE id_venta = ?
      `;
      const ventaResult = await query(ventaSql, [ventaId]);
      const venta = (Array.isArray(ventaResult) ? ventaResult[0] : ventaResult) as any;
      
      const propinaVenta = venta?.propina || 0;

      // Obtener la caja actual (estado = 1)
      const cajaActualSql = `
        SELECT id_caja, efectivo, venta, devolucion, comision, propina
        FROM cajas 
        WHERE estado = 1 
        ORDER BY fecha_apertura DESC 
        LIMIT 1
      `;
      const cajaActualResult = await query(cajaActualSql);
      const cajaActual = (
        Array.isArray(cajaActualResult) ? cajaActualResult[0] : cajaActualResult
      ) as any;

      // Confirmar anulación
      await query('UPDATE ventas SET estado = 0, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

      await query("UPDATE solicitudes_anulacion SET estado = 'confirmada' WHERE token = ?", [
        token
      ]);

      // Actualizar caja con los descuentos correspondientes
      if (cajaActual) {
        console.log('🔍 Caja actual encontrada:', cajaActual);
        
        // Descontar el total de la venta del efectivo
        const nuevoEfectivo = Math.max(0, cajaActual.efectivo - totalVenta);
        // Descontar el sub_total de la columna venta
        const nuevaVenta = Math.max(0, cajaActual.venta - totalSubTotal);
        // Sumar el total de la venta a la columna devolucion
        const nuevaDevolucion = (cajaActual.devolucion || 0) + totalVenta;
        // Descontar el total de la comisión de la columna comision
        const nuevaComision = Math.max(0, (cajaActual.comision || 0) - totalComision);
        // Descontar la propina si la venta la tuvo
        let nuevaPropina = cajaActual.propina || 0;
        if (propinaVenta && propinaVenta > 0) {
          nuevaPropina = Math.max(0, nuevaPropina - propinaVenta);
        }

        console.log('🔍 Valores calculados para caja:', {
          nuevoEfectivo,
          nuevaVenta,
          nuevaDevolucion,
          nuevaComision,
          nuevaPropina
        });

        await query(
          `UPDATE cajas 
           SET efectivo = ?, venta = ?, devolucion = ?, comision = ?, propina = ?
           WHERE id_caja = ?`,
          [
            nuevoEfectivo,
            nuevaVenta,
            nuevaDevolucion,
            nuevaComision,
            nuevaPropina,
            cajaActual.id_caja
          ]
        );
        
        console.log('🔍 Caja actualizada exitosamente');
      } else {
        console.log('🔍 No se encontró caja activa');
      }

      // Enviar mensaje de confirmación por WhatsApp
      const mensajeConfirmacion = `✅ *ANULACIÓN CONFIRMADA*

La venta con código *${codigoVenta}* ha sido anulada exitosamente.

📋 *Detalles:*
• Código: ${codigoVenta}
• Cliente: ${clienteNombre}
• Total: $${totalVenta?.toLocaleString() || 0}

La venta ya no está activa en el sistema.`;

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      await enviarWhatsApp(adminWhatsApp, mensajeConfirmacion);

      // Enviar notificación al sistema
      const notificationData = {
        id: ventaId,
        codigo: codigoVenta,
        cliente: clienteNombre,
        total: totalVenta,
        accion: 'anulacion_confirmada',
        timestamp: new Date().toISOString()
      };
      
      console.log('🔔 Enviando notificación de anulación confirmada:', notificationData);
      console.log('🔔 Tipo de notificación: anulacion_confirmada');
      console.log('🔔 Datos de notificación:', JSON.stringify(notificationData, null, 2));
      
      // Guardar notificación en la base de datos
      try {
        await query(`
          INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion)
          VALUES (?, ?, 0, NOW())
        `, ['anulacion_confirmada', JSON.stringify(notificationData)]);
        console.log('🔔 Notificación guardada en la base de datos');
      } catch (dbError) {
        console.error('🔔 Error guardando notificación en BD:', dbError);
      }
      
      try {
        sendNotificationToAll('anulacion_confirmada', notificationData);
        console.log('🔔 Notificación enviada exitosamente');
      } catch (error) {
        console.error('🔔 Error enviando notificación:', error);
      }

      // Respuesta JSON simple
      return res.status(200).json({
        success: true,
        message: 'Anulación confirmada exitosamente',
        venta: {
          codigo: codigoVenta,
          cliente: clienteNombre,
          total: totalVenta
        }
      });
    } else if (action === 'rechazar') {
      // Rechazar anulación
      await query('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

      await query("UPDATE solicitudes_anulacion SET estado = 'rechazada' WHERE token = ?", [token]);

      // Enviar mensaje de rechazo por WhatsApp
      const mensajeRechazo = `❌ *ANULACIÓN RECHAZADA*

La solicitud de anulación para la venta con código *${codigoVenta}* ha sido rechazada.

📋 *Detalles:*
• Código: ${codigoVenta}
• Cliente: ${clienteNombre}
• Total: $${totalVenta?.toLocaleString() || 0}

La venta permanece activa en el sistema.`;

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      await enviarWhatsApp(adminWhatsApp, mensajeRechazo);

      // Enviar notificación al sistema
      const notificationData = {
        id: ventaId,
        codigo: codigoVenta,
        cliente: clienteNombre,
        total: totalVenta,
        accion: 'anulacion_rechazada',
        timestamp: new Date().toISOString()
      };
      
      console.log('🔔 Enviando notificación de anulación rechazada:', notificationData);
      console.log('🔔 Tipo de notificación: anulacion_rechazada');
      console.log('🔔 Datos de notificación:', JSON.stringify(notificationData, null, 2));
      
      // Guardar notificación en la base de datos
      try {
        await query(`
          INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion)
          VALUES (?, ?, 0, NOW())
        `, ['anulacion_rechazada', JSON.stringify(notificationData)]);
        console.log('🔔 Notificación guardada en la base de datos');
      } catch (dbError) {
        console.error('🔔 Error guardando notificación en BD:', dbError);
      }
      
      try {
        sendNotificationToAll('anulacion_rechazada', notificationData);
        console.log('🔔 Notificación enviada exitosamente');
      } catch (error) {
        console.error('🔔 Error enviando notificación:', error);
      }

      // Respuesta JSON simple
      return res.status(200).json({
        success: true,
        message: 'Anulación rechazada exitosamente',
        venta: {
          codigo: codigoVenta,
          cliente: clienteNombre,
          total: totalVenta
        }
      });
    } else {
      return res.status(400).json({ error: 'Acción inválida' });
    }
  } catch (error) {
    console.error('Error al procesar anulación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 