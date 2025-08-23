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



    // Construir la consulta base
    let queryString = `
      SELECT
        A.id_anticipo,
        A.usuario_id,
        A.fecha_crea,
        A.fecha_mod,
        A.monto,
        A.estado,
        CONCAT(U.nombre, ' ', U.apellido) AS usuario
      FROM anticipos A
      INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      WHERE A.usuario_id = ?
    `;

    const queryParams: (number | string)[] = [userId];

    // Agregar filtros de fecha si se proporcionan
    if (startDate && endDate) {
      queryString += ` AND DATE(A.fecha_crea) BETWEEN ? AND ?`;
      queryParams.push(startDate as string, endDate as string);
    }

    queryString += ` ORDER BY A.fecha_crea DESC`;

    // Obtener anticipos del usuario
    const anticipos = (await query(queryString, queryParams)) as any[];

    // Mapear los estados para mejor legibilidad
    const anticiposWithStatus = anticipos.map(item => ({
      ...item,
      estado_texto: item.estado === 0 ? 'PAGADO' : 'POR PAGAR'
    }));



    return res.status(200).json({
      success: true,
      data: anticiposWithStatus
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
