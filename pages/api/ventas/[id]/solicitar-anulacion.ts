/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { enviarMensajeAnulacion } from '@/lib/whatsappService';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { formatDateLabel } from '@/lib/calendarUtils';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtener usuario logueado
  const usuarioLogueado = (req as NextApiRequest & { user?: { id?: string; nick?: string } }).user;

  // Obtener nombre completo del usuario desde la base de datos
  let nombreCompleto = 'Usuario del Sistema';
  if (usuarioLogueado?.id) {
    try {
      const usuarioSql = `
        SELECT CONCAT(nombre, " ", apellido) as nombre_completo
        FROM usuarios 
        WHERE id_usuario = ?
      `;
      const usuarioResult = await query(usuarioSql, [usuarioLogueado.id]);
      if (Array.isArray(usuarioResult) && usuarioResult.length > 0) {
        nombreCompleto = (usuarioResult[0] as { nombre_completo?: string }).nombre_completo || 'Usuario del Sistema';
      }
    } catch (error) {
      nombreCompleto = usuarioLogueado.nick || 'Usuario del Sistema';
    }
  }

  const { id } = req.query;
  const ventaId = id as string;

  if (!ventaId) {
    return res.status(400).json({ error: 'ID de venta inválido' });
  }

  try {
    const { estado, motivo } = req.body;

    // Validar que la venta existe y obtener información
    const ventaSql = `
      SELECT 
        v.*,
        COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, " ", g.apellido)
          ELSE NULL
        END as garzon_nombre,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN g.nick
          ELSE NULL
        END as garzon_nick
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
      LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
      WHERE v.id_venta = ?
    `;

    const ventaResult = await query(ventaSql, [ventaId]);
    if (!Array.isArray(ventaResult) || ventaResult.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaResult[0] as { estado: number; codigo: string; cliente_nombre: string; total?: number; fecha_crea: string };

    // Verificar que la venta no esté ya anulada o con solicitud de anulación pendiente
    if (venta.estado === 0 || venta.estado === 3) {
      return res.status(400).json({
        success: false,
        error:
          venta.estado === 0
            ? 'La venta ya está anulada'
            : 'La venta ya tiene una solicitud de anulación pendiente'
      });
    }

    // Obtener información de las anfitrionas de la venta
    const anfitrionasSql = `
      SELECT 
        u.nick as usuario_nick
      FROM ventas_usuarios vu
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario
      WHERE vu.venta_id = ?
    `;

    const anfitrionasResult = await query(anfitrionasSql, [ventaId]);
    const anfitrionas = Array.isArray(anfitrionasResult)
      ? anfitrionasResult.map((u: { usuario_nick?: string }) => u.usuario_nick).filter(Boolean)
      : [];

    // Usar el nombre completo del usuario logueado
    const usuarioNombre = nombreCompleto;

    // Actualizar estado a solicitud de anulación (estado = 3)
    const nuevoEstado = 3;
    await query('UPDATE ventas SET estado = ?, fecha_mod = NOW() WHERE id_venta = ?', [
      nuevoEstado,
      ventaId
    ]);

    // Enviar notificación SSE a todos los clientes para actualizar en tiempo real
    sendNotificationToAll('sale_cancelled', {
      ventaId,
      codigo: venta.codigo,
      estado: nuevoEstado
    });

    // Generar token único para esta solicitud
    const token =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Guardar token en la base de datos (crear tabla si no existe)
    try {
      const { generateUUID } = await import('@/lib/db');
      // Crear tabla si no existe
      await query(
        `CREATE TABLE IF NOT EXISTS solicitudes_anulacion (
          id VARCHAR(36) PRIMARY KEY,
          venta_id VARCHAR(36) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          estado ENUM('pendiente', 'confirmada', 'rechazada') DEFAULT 'pendiente',
          fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (venta_id) REFERENCES ventas(id_venta) ON DELETE CASCADE
        )`
      );

      // Agregar columnas si no existen
      try {
        await query(
          "ALTER TABLE solicitudes_anulacion ADD COLUMN solicitado_por VARCHAR(255) DEFAULT 'Usuario del Sistema'"
        );
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      try {
        await query(
          "ALTER TABLE solicitudes_anulacion ADD COLUMN motivo VARCHAR(500) DEFAULT 'Motivo no especificado'"
        );
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      await query(
        'INSERT INTO solicitudes_anulacion (id, venta_id, token, solicitado_por, motivo) VALUES (?, ?, ?, ?, ?)',
        [generateUUID(), ventaId, token, usuarioNombre, motivo]
      );
    } catch (error) {
      console.error('Error al guardar token:', error);
    }

    // Obtener número de WhatsApp del administrador
    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; // URL de ngrok

    // Enviar mensaje WhatsApp usando el servicio
    try {
      await enviarMensajeAnulacion({
        numeroAdmin: adminWhatsApp,
        codigoVenta: venta.codigo,
        clienteNombre: venta.cliente_nombre,
        total: venta.total || 0,
        fechaVenta: formatDateLabel(venta.fecha_crea),
        motivo: motivo,
        solicitadoPor: usuarioNombre,
        anfitrionas: anfitrionas.filter((n): n is string => Boolean(n)),
        token: token,
        baseUrl: baseUrl
      });
    } catch (whatsappError) {
      console.error('Error al enviar WhatsApp:', whatsappError);
      // No fallar la operación si WhatsApp falla
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud de anulación enviada correctamente',
      venta: {
        id: ventaId,
        codigo: venta.codigo,
        estado: nuevoEstado
      }
    });
  } catch (error: unknown) {
    console.error('❌ [SOLICITAR ANULACION] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);



