import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { enviarMensajeDevolucionServicio } from '@/lib/whatsappService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;
    const { motivo, solicitadoPor } = req.body;

    if (!motivo || !solicitadoPor) {
      return res.status(400).json({ error: 'Motivo y solicitadoPor son requeridos' });
    }

    const servicioId = parseInt(id as string);
    if (isNaN(servicioId)) {
      return res.status(400).json({ error: 'ID de servicio inválido' });
    }

    // Obtener información del servicio
    const servicioSql = `
      SELECT 
        s.*,
        COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre,
        h.nombre as habitacion_numero,
        GROUP_CONCAT(u.nombre SEPARATOR ', ') as anfitrionas_nombres
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      LEFT JOIN usuarios u ON ds.usuario_id = u.id_usuario
      WHERE s.id_servicio = ?
      GROUP BY s.id_servicio
    `;

    const servicios = await query(servicioSql, [servicioId]);

    if (!Array.isArray(servicios) || servicios.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const servicio = servicios[0] as any;

    // Verificar que el servicio esté activo
    if (servicio.estado !== 1) {
      return res.status(400).json({ error: 'El servicio no está activo' });
    }



    // Cambiar estado a 4 (solicitud de anulación/devolución)
    await query(
      "UPDATE servicios SET estado = 4, fecha_mod = NOW() WHERE id_servicio = ?",
      [servicioId]
    );


    // Pausar el temporizador del servicio (si estuviera activo)
    // Esto se maneja en el frontend con el contexto de temporizador

    // Generar token único para esta solicitud
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Guardar token en la base de datos (crear tabla si no existe)
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS solicitudes_devolucion_servicios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          servicio_id INT NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          estado ENUM('pendiente', 'confirmada', 'rechazada') DEFAULT 'pendiente',
          fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );

      await query(
        "INSERT INTO solicitudes_devolucion_servicios (servicio_id, token) VALUES (?, ?)",
        [servicioId, token]
      );
    } catch (error) {
      console.error("Error al guardar token:", error);
      // Continuar sin el token si hay error
    }

    // Obtener número de WhatsApp del administrador
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || "59172419112";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Preparar datos de anfitrionas
    const anfitrionas = servicio.anfitrionas_nombres
      ? servicio.anfitrionas_nombres.split(', ').filter((nombre: string) => nombre.trim())
      : [];

    // Enviar mensaje WhatsApp
    try {
      await enviarMensajeDevolucionServicio({
        numeroAdmin: adminWhatsApp,
        codigoServicio: servicio.codigo,
        clienteNombre: servicio.cliente_nombre || 'Sin cliente',
        total: servicio.total || 0,
        fechaServicio: new Date(servicio.fecha_crea).toLocaleDateString(),
        motivo: motivo,
        solicitadoPor: solicitadoPor,
        habitacion: servicio.habitacion_numero,
        tiempo: servicio.tiempo,
        anfitrionas: anfitrionas,
        token: token,
        baseUrl: baseUrl
      });
    } catch (whatsappError) {
      console.error("Error al enviar WhatsApp:", whatsappError);
      // No fallar la operación si WhatsApp falla
    }

    return res.status(200).json({
      message: "Solicitud de devolución enviada correctamente",
      servicio: {
        id: servicioId,
        codigo: servicio.codigo,
        estado: 4
      }
    });

  } catch (error) {

    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
} 