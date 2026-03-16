
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withAuth, getCurrentUser } from "@/lib/middleware/auth";
import { enviarWhatsApp, enviarMensajeAnticipo } from "@/lib/whatsappService";
import { sendNotificationToAll } from "../notifications/sse";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return await crearSolicitud(req, res);
  }
  
  if (req.method === "GET") {
    return await listarSolicitudes(req, res);
  }

  return res.status(405).json({ success: false, message: "Método no permitido" });
}

async function crearSolicitud(req: NextApiRequest, res: NextApiResponse) {
  const { monto, motivo } = req.body;
  const user = getCurrentUser(req);

  if (!user) return res.status(401).json({ success: false, message: "No autorizado" });

  const montoSolicitado = Number(monto);
  if (!montoSolicitado || montoSolicitado <= 0) {
    return res.status(400).json({ success: false, message: "Monto inválido" });
  }

  try {
    const pendiente = await query(
      "SELECT id_solicitud FROM solicitudes_anticipos WHERE usuario_id = ? AND estado = 'pendiente'",
      [user.id]
    ) as any[];

    if (pendiente.length > 0) {
      return res.status(400).json({ success: false, message: "Ya tienes una solicitud pendiente de aprobación" });
    }

    // 2. Asegurar que la tabla existe y tiene la estructura correcta (Idéntico a anulaciones)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS solicitudes_anticipos (
          id_solicitud VARCHAR(36) PRIMARY KEY,
          usuario_id VARCHAR(36) NOT NULL,
          monto DECIMAL(10,2) NOT NULL,
          motivo VARCHAR(500),
          token VARCHAR(255) UNIQUE NOT NULL,
          estado ENUM('pendiente', 'confirmada', 'rechazada') DEFAULT 'pendiente',
          fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          admin_id VARCHAR(36),
          motivo_rechazo VARCHAR(500),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario)
        )
      `);
    } catch (e) {
      console.error("Error al verificar tabla solicitudes_anticipos:", e);
    }

    const { generateUUID } = await import('@/lib/db');
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const id_solicitud = generateUUID();
    await query(
      "INSERT INTO solicitudes_anticipos (id_solicitud, usuario_id, monto, motivo, token, estado) VALUES (?, ?, ?, ?, ?, 'pendiente')",
      [id_solicitud, user.id, montoSolicitado, motivo, token]
    );

    const solicitudId = id_solicitud;

    // 3. Obtener datos completos del usuario para el mensaje
    let nombreCompleto = user.username;
    const userData = await query(
      "SELECT CONCAT(nombre, ' ', apellido) as nombre_completo, nick FROM usuarios WHERE id_usuario = ?", 
      [user.id]
    ) as any[];
    
    if (userData.length > 0) {
      nombreCompleto = userData[0].nombre_completo || userData[0].nick || user.username;
    }

    const nombre = nombreCompleto;

    // 4. Enviar WhatsApp al admin
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    await enviarMensajeAnticipo({
      numeroAdmin: adminWhatsApp,
      solicitudId,
      usuarioNombre: nombre,
      monto: montoSolicitado,
      motivo: motivo || '',
      token,
      baseUrl
    });

    // 5. Notificar via SSE
    sendNotificationToAll('new_anticipo_request', {
      id: solicitudId,
      usuario: nombre,
      monto: montoSolicitado
    });

    return res.status(201).json({ 
      success: true, 
      message: "Solicitud enviada al administrador",
      id: solicitudId 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error interno" });
  }
}

async function listarSolicitudes(req: NextApiRequest, res: NextApiResponse) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ success: false, message: "No autorizado" });

  try {
    const solicitudes = await query(
      `SELECT s.*, 
       CASE 
         WHEN s.estado = 'pendiente' THEN 'PENDIENTE DE APROBACION'
         WHEN s.estado = 'confirmada' THEN 'APROBADA'
         WHEN s.estado = 'rechazada' THEN 'RECHAZADA'
       END as estado_texto
       FROM solicitudes_anticipos s 
       WHERE s.usuario_id = ? 
       ORDER BY s.fecha_crea DESC`,
      [user.id]
    );

    return res.status(200).json({ success: true, data: solicitudes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al listar solicitudes" });
  }
}

export default withAuth(handler);
