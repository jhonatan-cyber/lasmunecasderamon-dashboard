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

  

    // Buscar la solicitud por token (consulta corregida según estructura real de la tabla)
    const solicitudSql = `
      SELECT 
        sa.venta_id,
        sa.fecha_solicitud,
        sa.solicitado_por,
        sa.motivo,
        v.codigo,
        v.total,
        COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Cliente no encontrado') as cliente_nombre
      FROM solicitudes_anulacion sa
      LEFT JOIN ventas v ON sa.venta_id = v.id_venta
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      WHERE sa.token = ? AND sa.estado = 'pendiente'
    `;



    const solicitudResult = await query(solicitudSql, [token]);
    

    
    if (!Array.isArray(solicitudResult) || solicitudResult.length === 0) {
      return res.status(404).json({ 
        error: 'Solicitud no encontrada o ya procesada',
        message: 'Esta solicitud de anulación ya fue procesada o no existe.'
      });
    }

    const solicitud = solicitudResult[0] as any;

    return res.status(200).json({
      success: true,
      solicitud: {
        venta_id: solicitud.venta_id,
        codigo: solicitud.codigo,
        total: solicitud.total,
        cliente_nombre: solicitud.cliente_nombre,
        motivo: solicitud.motivo,
        solicitado_por: solicitud.solicitado_por,
        fecha_solicitud: solicitud.fecha_solicitud
      }
    });
    
  } catch (error) {
   
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 