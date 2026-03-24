import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { withTransaction } from '@/lib/transactionUtils';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { buildServicioAnulacionMessage } from '@/lib/notificationMessages';

type SolicitudAnulacionServicioRow = {
  servicio_id: string;
  estado?: string;
  codigo: string;
  servicio_estado?: number;
  total: number;
  metodo_pago?: string | null;
  habitacion_id?: string | null;
  cliente_id?: string | null;
  cliente_nombre: string;
  habitacion_numero?: string | null;
  tiempo?: number | null;
  anfitrionas_nombres?: string | null;
};

type AnfitrionaRow = {
  usuario_id: string;
  comision: number;
};

type RoomInfoRow = {
  precio: number;
  comision_anfitriona: number;
  tiempo: number;
};

type CajaRow = {
  id_caja: string;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  servicio: number;
  devolucion: number;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const { token, action } = req.body;

  if (!token || !action || !['confirmar', 'rechazar'].includes(action)) {
    return res.status(400).json({ error: 'Token y accion requeridos' });
  }

  try {
    const result = await withTransaction(async connection => {
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

      const solicitudResult = (await connection(
        solicitudSql,
        [token]
      )) as SolicitudAnulacionServicioRow[];

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
      const anfitrionasNombres = solicitud.anfitrionas_nombres || 'Sin anfitriones';
      const metodoPago = solicitud.metodo_pago || 'efectivo';

      if (action === 'confirmar') {
        const now = getNowInBusinessTimezone();
        await connection(
          'UPDATE servicios SET estado = 0, fecha_mod = ? WHERE id_servicio = ?',
          [now, servicioId]
        );

        const { generateUUID } = await import('@/lib/db');
        const devServId = generateUUID();
        await connection(
          'INSERT INTO devoluciones_servicios (id, servicio_id, pieza_id, cliente_id, total, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
          [devServId, servicioId, habitacionId || 0, solicitud.cliente_id || 0, totalServicio, now]
        );

        const anfitrionas = (await connection(
          'SELECT usuario_id, comision FROM detalle_servicios WHERE servicio_id = ?',
          [servicioId]
        )) as AnfitrionaRow[];
        for (const anf of anfitrionas) {
          const detDevId = generateUUID();
          await connection(
            'INSERT INTO detalle_devoluciones_servicios (id, devolucion_servicio_id, usuario_id, monto) VALUES (?, ?, ?, ?)',
            [detDevId, devServId, anf.usuario_id, anf.comision || 0]
          );
          await connection('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [anf.usuario_id]);
        }

        if (habitacionId) {
          const roomInfo = (await connection(
            'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
            [habitacionId]
          )) as RoomInfoRow[];
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

        await connection(
          'UPDATE comisiones SET estado = 2, fecha_mod = ? WHERE servicio_id = ?',
          [now, servicioId]
        );

        const cajaActualResult = (await connection(`
          SELECT id_caja, efectivo, tarjeta, transferencia, servicio, devolucion
          FROM cajas 
          WHERE estado = 1 
          ORDER BY fecha_apertura DESC 
          LIMIT 1
        `)) as CajaRow[];
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
          message: 'Anulacion de servicio confirmada exitosamente',
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
      }

      const now = getNowInBusinessTimezone();
      await connection(
        'UPDATE servicios SET estado = 2, fecha_mod = ? WHERE id_servicio = ?',
        [now, servicioId]
      );
      await connection(
        "UPDATE solicitudes_anulacion_servicios SET estado = 'rechazada' WHERE token = ?",
        [token]
      );
      return {
        success: true,
        message: 'Anulacion de servicio rechazada exitosamente',
        servicio: {
          id: servicioId,
          codigo: codigoServicio,
          cliente: clienteNombre,
          total: totalServicio,
          habitacion: habitacionNombre,
          anfitrionas: anfitrionasNombres
        }
      };
    });

    if (result.success) {
      const type =
        action === 'confirmar' ? 'anulacion_servicio_confirmada' : 'anulacion_servicio_rechazada';
      const notificationData = {
        ...result.servicio,
        accion: type,
        timestamp: new Date().toISOString()
      };

      try {
        const now = getNowInBusinessTimezone();
        await query(
          `INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion) VALUES (?, ?, 0, ?)`,
          [type, JSON.stringify(notificationData), now]
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
      const msg = buildServicioAnulacionMessage({
        action,
        codigo: result.servicio.codigo,
        cliente: result.servicio.cliente,
        habitacion: result.servicio.habitacion || 'Sin habitacion',
        total: result.servicio.total || 0
      });
      await enviarWhatsApp(adminWhatsApp, msg);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en procesar-anulacion servicios:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return res.status(message.includes('No encontrada') ? 404 : 500).json({
      success: false,
      error: message
    });
  }
}

export default handler;
