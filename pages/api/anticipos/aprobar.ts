
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";
import { enviarWhatsApp, enviarRespuestaAnticipo } from "@/lib/whatsappService";
import jwt from 'jsonwebtoken';

// Helper local para extraer usuario si hay token JWT (opcional)
async function getAuthenticatedUser(req: NextApiRequest) {
  let token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    return decoded;
  } catch (err) {
    return null;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Respuesta directa desde WhatsApp Webhook (si se implementa)
    return await aprobarRechazarSolicitud(req, res, true);
  }
  
  if (req.method === "PUT") {
    // Procesa desde la web (con o sin token de seguridad)
    const hasToken = !!req.body.token;
    const user = await getAuthenticatedUser(req);
    
    // Si no hay token de seguridad y no hay usuario autenticado, error 401
    if (!hasToken && !user) {
      return res.status(401).json({ success: false, message: "No autorizado" });
    }

    // Guardar usuario en req para que aprobarRechazar lo use
    (req as any).user = user;
    return await aprobarRechazarSolicitud(req, res);
  }
  
  return res.status(405).json({ success: false, message: "Método no permitido" });
}

async function aprobarRechazarSolicitud(req: NextApiRequest, res: NextApiResponse, fromWhatsApp = false) {
  const { solicitud_id, token, accion, motivo_rechazo } = req.body;
  const admin = (req as any).user;

  if (!solicitud_id && !token) {
    return res.status(400).json({ success: false, message: "ID o Token requerido" });
  }

  try {
    // 1. Obtener solicitud (prioriza Token si existe)
    let solicitudResult: any[] = [];
    if (token) {
      solicitudResult = await query(
        `SELECT s.*, u.nombre, u.apellido, u.telefono FROM solicitudes_anticipos s
         JOIN usuarios u ON s.usuario_id = u.id_usuario WHERE s.token = ?`,
        [token]
      ) as any[];
    } else {
      solicitudResult = await query(
        `SELECT s.*, u.nombre, u.apellido, u.telefono FROM solicitudes_anticipos s
         JOIN usuarios u ON s.usuario_id = u.id_usuario WHERE s.id_solicitud = ?`,
        [solicitud_id]
      ) as any[];
    }

    if (solicitudResult.length === 0) {
      return res.status(404).json({ success: false, message: "Solicitud no encontrada" });
    }

    const solicitud = solicitudResult[0];
    const sId = solicitud.id_solicitud;

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: "La solicitud ya ha sido procesada o no está pendiente" });
    }

    if (accion === "aprobar") {
      await withTransaction(async (trx) => {
        const { generateUUID } = await import('@/lib/db');
        // A. Actualizar solicitud
        await trx("UPDATE solicitudes_anticipos SET estado = 'confirmada', admin_id = ? WHERE id_solicitud = ?", [admin?.id || null, sId]);
        
        // B. Crear el anticipo real
        const id_anticipo = generateUUID();
        await trx("INSERT INTO anticipos (id_anticipo, usuario_id, monto, estado) VALUES (?, ?, ?, 1)", [id_anticipo, solicitud.usuario_id, solicitud.monto]);
        
        // C. Afectar caja
        const cajaResult = await trx(`SELECT id_caja, efectivo FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`) as any[];
        if (cajaResult.length > 0 && cajaResult[0].efectivo >= solicitud.monto) {
          await trx("UPDATE cajas SET efectivo = efectivo - ?, anticipo = anticipo + ? WHERE id_caja = ?", 
            [solicitud.monto, solicitud.monto, cajaResult[0].id_caja]
          );
        }
      });

      if (solicitud.telefono) {
        await enviarRespuestaAnticipo({
          numeroUsuario: solicitud.telefono,
          solicitudId: sId,
          monto: Number(solicitud.monto),
          estado: 'aprobada'
        });
      }
      return res.status(200).json({ success: true, message: "Aprobada correctamente" });
    } else {
      // Rechazar (Estado rechazada)
      await query("UPDATE solicitudes_anticipos SET estado = 'rechazada', motivo_rechazo = ?, admin_id = ? WHERE id_solicitud = ?", 
        [motivo_rechazo || 'Rechazado por el administrador', admin?.id || null, sId]
      );

      if (solicitud.telefono) {
        await enviarRespuestaAnticipo({
          numeroUsuario: solicitud.telefono,
          solicitudId: sId,
          monto: Number(solicitud.monto),
          estado: 'rechazada',
          motivoRechazo: motivo_rechazo
        });
      }
      return res.status(200).json({ success: true, message: "Rechazada correctamente" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error interno" });
  }
}

export default handler;