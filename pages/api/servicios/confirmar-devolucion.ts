import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
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

    const result = await withTransaction(async connection => {
      // Buscar la solicitud de devolución
      const solicitudSql = `
        SELECT 
          sds.*,
          s.codigo,
          s.total,
          s.fecha_crea,
          s.habitacion_id,
          s.cliente_id,
          c.nombre as cliente_nombre
        FROM solicitudes_devolucion_servicios sds
        JOIN servicios s ON sds.servicio_id = s.id_servicio
        LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
        WHERE sds.token = ? AND sds.estado = 'pendiente'
        FOR UPDATE
      `;

      const solicitudes = (await connection(solicitudSql, [token])) as any[];

      if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const solicitud = solicitudes[0];
      const servicioId = solicitud.servicio_id;

      // Actualizar estado de la solicitud
      const nuevoEstadoSolicitud = action === 'confirmar' ? 'confirmada' : 'rechazada';
      await connection('UPDATE solicitudes_devolucion_servicios SET estado = ? WHERE token = ?', [
        nuevoEstadoSolicitud,
        token
      ]);

      // Actualizar estado del servicio
      const nuevoEstadoServicio = action === 'confirmar' ? 0 : 2;
      await connection('UPDATE servicios SET estado = ?, fecha_mod = NOW() WHERE id_servicio = ?', [
        nuevoEstadoServicio,
        servicioId
      ]);

      if (action === 'confirmar') {
        const habitacionId = solicitud.habitacion_id;
        const totalServicio = solicitud.total || 0;

        const { generateUUID } = await import('@/lib/db');
        // 1. Registrar la DEVOLUCIÓN
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
          await connection('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [anf.usuario_id]);
        }

        // 2. Liberar habitación si no es área libre
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

        // 3. Actualizar caja
        const cajaActivaResult = (await connection(
          'SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        )) as any[];
        if (cajaActivaResult.length > 0) {
          const caja = cajaActivaResult[0];
          const [servicioInfo] = (await connection(
            'SELECT iva FROM servicios WHERE id_servicio = ?',
            [servicioId]
          )) as any[];
          const ivaServicio = servicioInfo?.iva || 0;

          await connection(
            `UPDATE cajas 
             SET efectivo = GREATEST(0, efectivo - ?), iva = GREATEST(0, iva - ?), devoluciones = devoluciones + ?
             WHERE id_caja = ?`,
            [totalServicio, ivaServicio, totalServicio, caja.id_caja]
          );
        }

        // 4. Anular comisiones
        await connection(
          'UPDATE comisiones SET estado = 2, fecha_mod = NOW() WHERE servicio_id = ?',
          [servicioId]
        );
      }

      return {
        success: true,
        message: `Servicio ${action === 'confirmar' ? 'devuelto' : 'mantenido activo'} correctamente`,
        servicio: {
          id: servicioId,
          codigo: solicitud.codigo,
          total: solicitud.total,
          cliente_nombre: solicitud.cliente_nombre
        }
      };
    });

    // WhatsApp fuera de la transacción
    const emoji = action === 'confirmar' ? '✅' : '❌';
    const titulo = action === 'confirmar' ? 'DEVOLUCIÓN CONFIRMADA' : 'DEVOLUCIÓN RECHAZADA';
    const msg = `${emoji} *${titulo}*\n\nEl servicio con código *${result.servicio.codigo}* ha sido ${action === 'confirmar' ? 'devuelto exitosamente' : 'mantenido activo'}.\n\n📋 *Detalles:*\n• Cliente: ${result.servicio.cliente_nombre || 'Sin cliente'}\n• Total: $${result.servicio.total?.toLocaleString()}`;

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    await enviarWhatsApp(adminWhatsApp, msg);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error en confirmar-devolucion:', error);
    return res.status(error.message.includes('No encontrada') ? 404 : 500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}
