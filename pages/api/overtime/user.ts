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
    const { startDate, endDate, dates } = req.query;

    let sqlQuery = `
      SELECT 
        he.id_hora_extra,
        he.fecha_crea,
        he.hora,
        he.monto,
        he.total,
        he.estado,
        DATE_FORMAT(he.fecha_crea, '%Y-%m-%d') as fecha_formatted
      FROM horas_extras he
      WHERE he.usuario_id = ?
    `;

    const params: any[] = [userId];

    // Si se proporcionan fechas específicas
    if (dates) {
      const dateArray = (dates as string).split(',');
      const placeholders = dateArray.map(() => '?').join(',');
      sqlQuery += ` AND DATE(he.fecha_crea) IN (${placeholders})`;
      params.push(...dateArray);
    }
    // Si se proporciona rango de fechas
    else if (startDate && endDate) {
      sqlQuery += ` AND DATE(he.fecha_crea) BETWEEN ? AND ?`;
      params.push(startDate as string, endDate as string);
    }

    sqlQuery += ` ORDER BY he.fecha_crea DESC`;

    const horasExtras = await query(sqlQuery, params);

    return res.status(200).json({
      success: true,
      data: Array.isArray(horasExtras) ? horasExtras : [],
      message: 'Horas extras obtenidas exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
