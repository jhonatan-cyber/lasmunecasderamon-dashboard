import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token requerido" });
  }

  try {
    // Buscar la solicitud por token
    const solicitudResult = await query(`SELECT sas.servicio_id, sas.token, sas.estado, sas.solicitado_por, sas.motivo, sas.fecha_solicitud, s.codigo, s.total, s.tiempo, CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, h.nombre as habitacion_numero, GROUP_CONCAT(u.nick SEPARATOR ', ') as anfitrionas_nombres FROM solicitudes_anulacion_servicios sas LEFT JOIN servicios s ON sas.servicio_id = s.id_servicio LEFT JOIN clientes c ON s.cliente_id = c.id_cliente LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id LEFT JOIN usuarios u ON ds.usuario_id = u.id_usuario WHERE sas.token = ? AND sas.estado = 'pendiente' GROUP BY sas.servicio_id`, [token]);

    if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
      return res.status(404).json({ 
        error: "Solicitud no encontrada o ya procesada",
        message: "La solicitud de anulación no existe o ya fue procesada"
      });
    }

    const solicitud = solicitudResult[0] as any;
    return res.status(200).json({ 
      success: true, 
      solicitud: { 
        servicio_id: solicitud.servicio_id, 
        codigo: solicitud.codigo, 
        total: solicitud.total, 
        cliente_nombre: solicitud.cliente_nombre, 
        habitacion_numero: solicitud.habitacion_numero, 
        tiempo: solicitud.tiempo, 
        motivo: solicitud.motivo, 
        solicitado_por: solicitud.solicitado_por, 
        fecha_solicitud: solicitud.fecha_solicitud,
        anfitrionas: solicitud.anfitrionas_nombres
      } 
    });

  } catch (error) {
    console.error("Error al obtener solicitud de anulación:", error);
    return res.status(500).json({
      error: "Error interno del servidor",
      message: "Error al procesar la solicitud"
    });
  }
} 