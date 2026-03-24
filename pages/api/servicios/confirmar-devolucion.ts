import { NextApiRequest, NextApiResponse } from 'next';
import { withTransaction } from '@/lib/transactionUtils';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { buildServicioAnulacionMessage } from '@/lib/notificationMessages';

type SolicitudDevolucionRow = {
  servicio_id: string | number;
  codigo: string;
  total: number | string;
  fecha_crea: string;
  habitacion_id: string | number | null;
  cliente_id: string | number | null;
  cliente_nombre: string | null;
};

type DetalleServicioRow = {
  usuario_id: string | number;
  comision: number | string | null;
};

type RoomInfoRow = {
  precio: number | string | null;
  comision_anfitriona: number | string | null;
  tiempo: number | string | null;
};

type CajaRow = {
  id_caja: string | number;
};

type ServicioInfoRow = {
  iva: number | string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
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

      const solicitudes = (await connection(solicitudSql, [token])) as SolicitudDevolucionRow[];

      if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const solicitud = solicitudes[0];
      const servicioId = solicitud.servicio_id;

      const nuevoEstadoSolicitud = action === 'confirmar' ? 'confirmada' : 'rechazada';
      await connection('UPDATE solicitudes_devolucion_servicios SET estado = ? WHERE token = ?', [
        nuevoEstadoSolicitud,
        token
      ]);

      const now = getNowInBusinessTimezone();
      const nuevoEstadoServicio = action === 'confirmar' ? 0 : 2;
      await connection('UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?', [
        nuevoEstadoServicio,
        now,
        servicioId
      ]);

      if (action === 'confirmar') {
        const habitacionId = solicitud.habitacion_id;
        const totalServicio = Number(solicitud.total || 0);

        const { generateUUID } = await import('@/lib/db');
        const devServId = generateUUID();
        await connection(
          'INSERT INTO devoluciones_servicios (id, servicio_id, pieza_id, cliente_id, total, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
          [devServId, servicioId, habitacionId || 0, solicitud.cliente_id || 0, totalServicio, now]
        );

        const anfitrionas = (await connection(
          'SELECT usuario_id, comision FROM detalle_servicios WHERE servicio_id = ?',
          [servicioId]
        )) as DetalleServicioRow[];

        for (const anf of anfitrionas) {
          const detDevId = generateUUID();
          await connection(
            'INSERT INTO detalle_devoluciones_servicios (id, devolucion_servicio_id, usuario_id, monto) VALUES (?, ?, ?, ?)',
            [detDevId, devServId, anf.usuario_id, Number(anf.comision || 0)]
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

        const cajaActivaResult = (await connection(
          'SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        )) as CajaRow[];
        if (cajaActivaResult.length > 0) {
          const caja = cajaActivaResult[0];
          const [servicioInfo] = (await connection(
            'SELECT iva FROM servicios WHERE id_servicio = ?',
            [servicioId]
          )) as ServicioInfoRow[];
          const ivaServicio = Number(servicioInfo?.iva || 0);

          await connection(
            `UPDATE cajas 
             SET efectivo = GREATEST(0, efectivo - ?), iva = GREATEST(0, iva - ?), devoluciones = devoluciones + ?
             WHERE id_caja = ?`,
            [totalServicio, ivaServicio, totalServicio, caja.id_caja]
          );
        }

        await connection(
          'UPDATE comisiones SET estado = 2, fecha_mod = ? WHERE servicio_id = ?',
          [now, servicioId]
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

    const msg = buildServicioAnulacionMessage({
      action,
      codigo: result.servicio.codigo,
      cliente: result.servicio.cliente_nombre || 'Sin cliente',
      habitacion: 'Sin habitacion',
      total: Number(result.servicio.total || 0)
    });

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    await enviarWhatsApp(adminWhatsApp, msg);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en confirmar-devolucion:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return res.status(message.includes('No encontrada') ? 404 : 500).json({
      error: message
    });
  }
}
