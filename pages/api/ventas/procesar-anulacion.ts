import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
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

    const result = await withTransaction(async connection => {
      // Buscar la solicitud por token
      const solicitudSql = `
        SELECT 
          sa.*,
          v.codigo,
          v.total,
          v.metodo_pago,
          v.cliente_id,
          CONCAT(c.nombre, " ", c.apellido) as cliente_nombre
        FROM solicitudes_anulacion sa
        LEFT JOIN ventas v ON sa.venta_id = v.id_venta
        LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
        WHERE sa.token = ? AND sa.estado = 'pendiente'
        FOR UPDATE
      `;

      const solicitudResult = (await connection(solicitudSql, [token])) as any[];

      if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const solicitud = solicitudResult[0];
      const ventaId = solicitud.venta_id;
      const codigoVenta = solicitud.codigo;
      const clienteNombre = solicitud.cliente_nombre;
      const totalVenta = solicitud.total;
      const metodoPago = solicitud.metodo_pago || 'efectivo';

      if (action === 'confirmar') {
        // 1. Obtener detalles de la venta y usuarios
        const detallesVenta = (await connection('SELECT * FROM detalle_ventas WHERE venta_id = ?', [
          ventaId
        ])) as any[];
        const usuariosVenta = (await connection(
          'SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?',
          [ventaId]
        )) as any[];

        // Calcular totales para la caja
        let totalComision = 0;
        let totalSubTotal = 0;
        detallesVenta.forEach(d => {
          totalComision += Number(d.comision || 0);
          totalSubTotal += Number(d.sub_total || d.precio * d.cantidad || 0);
        });

        const [ventaData] = (await connection('SELECT propina FROM ventas WHERE id_venta = ?', [
          ventaId
        ])) as any[];
        const propinaVenta = Number(ventaData?.propina || 0);

        // 2. Registrar la DEVOLUCIÓN en las tablas específicas
        const devVentaResult: any = await connection(
          'INSERT INTO devoluciones_ventas (cliente_id, venta_id, total, fecha_crea, estado) VALUES (?, ?, ?, NOW(), 1)',
          [solicitud.cliente_id || 0, ventaId, totalVenta]
        );
        const devVentaId = devVentaResult.insertId;

        for (const dv of detallesVenta) {
          const detDevResult: any = await connection(
            'INSERT INTO detalle_devoluciones_ventas (devolucion_venta_id, producto_id, cantidad, precio, comision, fecha_crea, estado) VALUES (?, ?, ?, ?, ?, NOW(), 1)',
            [devVentaId, dv.producto_id, dv.cantidad, dv.precio, dv.comision]
          );
          const detDevId = detDevResult.insertId;

          for (const uv of usuariosVenta) {
            await connection(
              'INSERT INTO devoluciones_ventas_usuarios (detalle_devolucion_venta_id, usuario_id) VALUES (?, ?)',
              [detDevId, uv.usuario_id]
            );
          }
        }

        // 3. Confirmar anulación en tablas de origen
        await connection('UPDATE ventas SET estado = 0, fecha_mod = NOW() WHERE id_venta = ?', [
          ventaId
        ]);
        await connection("UPDATE solicitudes_anulacion SET estado = 'confirmada' WHERE token = ?", [
          token
        ]);

        // 4. Actualizar caja
        const cajaActualResult = (await connection(`
          SELECT id_caja, efectivo, tarjeta, transferencia, venta, devolucion, comision, propina
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
            `UPDATE cajas 
             SET ${columnToUpdate} = GREATEST(0, ${columnToUpdate} - ?), 
                 venta = GREATEST(0, venta - ?), 
                 devolucion = devolucion + ?, 
                 comision = GREATEST(0, comision - ?), 
                 propina = GREATEST(0, propina - ?)
             WHERE id_caja = ?`,
            [totalVenta, totalSubTotal, totalVenta, totalComision, propinaVenta, cajaActual.id_caja]
          );
        }

        return {
          success: true,
          message: 'Anulación confirmada exitosamente',
          venta: { id: ventaId, codigo: codigoVenta, cliente: clienteNombre, total: totalVenta }
        };
      } else {
        // Rechazar
        await connection('UPDATE ventas SET estado = 1, fecha_mod = NOW() WHERE id_venta = ?', [
          ventaId
        ]);
        await connection("UPDATE solicitudes_anulacion SET estado = 'rechazada' WHERE token = ?", [
          token
        ]);
        return {
          success: true,
          message: 'Anulación rechazada exitosamente',
          venta: { codigo: codigoVenta, cliente: clienteNombre, total: totalVenta }
        };
      }
    });

    // Notificaciones (fuera de la transacción)
    if (result.success) {
      const type = action === 'confirmar' ? 'anulacion_confirmada' : 'anulacion_rechazada';
      const notificationData = {
        id: result.venta.id,
        codigo: result.venta.codigo,
        cliente: result.venta.cliente,
        total: result.venta.total,
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
      const emoji = action === 'confirmar' ? '✅' : '❌';
      const titulo = action === 'confirmar' ? 'CONFIRMADA' : 'RECHAZADA';
      const msg = `${emoji} *ANULACIÓN ${titulo}*\n\nLa venta con código *${result.venta.codigo}* ha sido ${action === 'confirmar' ? 'anulada' : 'mantenida'}.\n\n📋 *Detalles:*\n• Cliente: ${result.venta.cliente}\n• Total: $${result.venta.total?.toLocaleString()}`;
      await enviarWhatsApp(adminWhatsApp, msg);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error en procesar-anulacion:', error);
    return res.status(error.message.includes('No encontrada') ? 404 : 500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}
