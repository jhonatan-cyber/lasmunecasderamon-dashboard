/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const solicitudSql = `
      SELECT 
        s.id_solicitud,
        s.usuario_id,
        s.monto,
        s.motivo,
        s.fecha_crea,
        CONCAT(u.nombre, " ", u.apellido) as usuario_nombre,
        u.nick as usuario_nick
      FROM solicitudes_anticipos s
      LEFT JOIN usuarios u ON s.usuario_id = u.id_usuario
      WHERE s.token = ? AND s.estado = 'pendiente'
    `;

    const solicitudResult = await query(solicitudSql, [token]) as any[];
    
    if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Solicitud no encontrada o ya procesada.'
      });
    }

    const solicitud = solicitudResult[0];

    return res.status(200).json({
      success: true,
      solicitud: {
        id: solicitud.id_solicitud,
        usuario: solicitud.usuario_nombre,
        nick: solicitud.usuario_nick,
        monto: solicitud.monto,
        motivo: solicitud.motivo,
        fecha: solicitud.fecha_crea
      }
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

