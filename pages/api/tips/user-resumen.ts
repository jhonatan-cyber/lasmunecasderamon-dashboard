import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const userData = getCurrentUser(req);
    
    if (!userData) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const userId = userData.id;
    const { startDate, endDate } = req.query;

    // Construir la consulta para obtener resumen de propinas del usuario
    let queryString = `
      SELECT 
        U.id_usuario,
        U.nombre,
        U.apellido,
        MAX(DP.fecha_crea) AS fecha_crea,
        SUM(CASE 
            WHEN P.estado = 1 THEN DP.monto 
            ELSE 0 
        END) AS total
      FROM usuarios U
      INNER JOIN detalle_propinas DP ON DP.usuario_id = U.id_usuario
      INNER JOIN propinas P ON P.id_propina = DP.propina_id
      WHERE U.id_usuario = ?
    `;

    const queryParams: (number | string)[] = [userId];

    // Agregar filtros de fecha si se proporcionan
    if (startDate && endDate) {
      queryString += ` AND DATE(DP.fecha_crea) BETWEEN ? AND ?`;
      queryParams.push(startDate as string, endDate as string);
    }

    queryString += ` GROUP BY U.id_usuario, U.nombre, U.apellido`;

    // Obtener resumen de propinas del usuario
    const tips = (await query(queryString, queryParams)) as any[];

    return res.status(200).json({
      success: true,
      data: tips
    });
  } catch (error) {
    console.error('Error obteniendo resumen de propinas del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
