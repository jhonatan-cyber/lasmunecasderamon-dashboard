import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { buildVentaAnulacionMessage } from '@/lib/notificationMessages';

type SolicitudAnulacionVentaRow = {
  venta_id: string;
  codigo: string;
  total: number;
  metodo_pago?: string | null;
  cliente_id?: string | null;
  cliente_nombre: string;
};

type DetalleVentaRow = {
  id_producto: string;
  cantidad: number;
  precio: number;
  tipo: string;
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
          sva.venta_id,
          sv.codigo,
          sv.total,
          sv.metodo_pago,
          sv.cliente_id,
          CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre
        FROM solicitudes_anulacion_ventas sva
        LEFT JOIN ventas sv ON sva.venta_id = sv.id_venta
        LEFT JOIN clientes c ON sv.cliente_id = c.id_cliente
        WHERE sva.token = ? AND sva.estado = 'pendiente'
        FOR UPDATE
      `;

      const solicitudResult = (await connection(solicitudSql, [token])) as SolicitudAnulacionVentaRow[];

      if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const solicitud = solicitudResult[0];
      const ventaId = solicitud.venta_id;
      const codigoVenta = solicitud.codigo;
      const clienteNombre = solicitud.cliente_nombre || 'Sin cliente';
      const totalVenta = Number(solicitud.total || 0);
      const metodoPago = solicitud.metodo_pago || 'efectivo';

      if (action === 'confirmar') {
        await connection('UPDATE ventas SET estado = 0, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

        const { generateUUID } = await import('@/lib/db');
        const detalleResult = (await connection(
          `SELECT d.venta_id, d.producto_id as id_producto, d.cantidad, d.precio, p.tipo
           FROM detalle_ventas d
           LEFT JOIN productos p ON d.producto_id = p.id_producto
           WHERE d.venta_id = ?`,
          [ventaId]
        )) as DetalleVentaRow[];

        const devVentId = generateUUID();
        await connection(
          'INSERT INTO devoluciones_ventas (id, venta_id, cliente_id, total, fecha_crea) VALUES (?, ?, ?, ?, NOW())',
          [devVentId, ventaId, solicitud.cliente_id || 0, totalVenta]
        );

        for (const detalle of detalleResult) {
          const devDetalleId = generateUUID();
          await connection(
            'INSERT INTO detalle_devoluciones_ventas (id, devolucion_venta_id, producto_id, cantidad, precio, tipo) VALUES (?, ?, ?, ?, ?, ?)',
            [
              devDetalleId,
              devVentId,
              detalle.id_producto,
              detalle.cantidad,
              detalle.precio,
              detalle.tipo
            ]
          );
        }

        await connection(
          'UPDATE servicios SET estado = 2, fecha_mod = NOW() WHERE codigo_venta = ?',
          [codigoVenta]
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
            [totalVenta, totalVenta, totalVenta, cajaActual.id_caja]
          );
        }

        await connection("UPDATE solicitudes_anulacion_ventas SET estado = 'confirmada' WHERE token = ?", [token]);

        return {
          success: true,
          message: 'Anulacion de venta confirmada exitosamente',
          venta: {
            id: ventaId,
            codigo: codigoVenta,
            cliente: clienteNombre,
            total: totalVenta
          }
        };
      }

      await connection('UPDATE ventas SET estado = 2, fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);
      await connection("UPDATE solicitudes_anulacion_ventas SET estado = 'rechazada' WHERE token = ?", [token]);
      return {
        success: true,
        message: 'Anulacion de venta rechazada exitosamente',
        venta: {
          id: ventaId,
          codigo: codigoVenta,
          cliente: clienteNombre,
          total: totalVenta
        }
      };
    });

    if (result.success) {
      const type = action === 'confirmar' ? 'anulacion_venta_confirmada' : 'anulacion_venta_rechazada';
      const notificationData = {
        ...result.venta,
        accion: type,
        timestamp: new Date().toISOString()
      };

      try {
        await query(
          `INSERT INTO notificaciones_sistema (tipo, datos, leida, fecha_creacion) VALUES (?, ?, 0, NOW())`,
          [type, JSON.stringify(notificationData)]
        );
        sendNotificationToAll(type, notificationData);
      } catch (err) {
        console.error('Error enviando notificaciones:', err);
      }

      const adminWhatsApp =
        process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
      const msg = buildVentaAnulacionMessage({
        action,
        codigo: result.venta.codigo,
        cliente: result.venta.cliente,
        total: result.venta.total || 0
      });
      await enviarWhatsApp(adminWhatsApp, msg);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en procesar-anulacion ventas:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return res.status(message.includes('No encontrada') ? 404 : 500).json({
      success: false,
      error: message
    });
  }
}

export default handler;
