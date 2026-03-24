/* eslint-disable */
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
    const { dates, startDate, endDate } = req.query;



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

    // Si se proporcionan fechas específicas
    if (dates) {
      let dateArray: string[];
      if (Array.isArray(dates)) {
        dateArray = dates;
      } else {
        // Si es un string, dividir por comas
        dateArray = dates.split(',').map(date => date.trim());
      }
      
      if (dateArray.length > 0) {
        const placeholders = dateArray.map(() => 'DATE(?)').join(',');
        queryString += ` AND DATE(A.fecha_crea) IN (${placeholders})`;
        queryParams.push(...dateArray);

      }
    }
    // Si se proporciona rango de fechas
    else if (startDate && endDate) {
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



    // Consulta de prueba para verificar datos del usuario
    const testQuery = `
      SELECT COUNT(*) as total, MIN(fecha_crea) as min_date, MAX(fecha_crea) as max_date
      FROM anticipos 
      WHERE usuario_id = ?
    `;
    const testResult = await query(testQuery, [userId]);


    return res.status(200).json({
      success: true,
      data: anticiposWithStatus,
      count: anticiposWithStatus.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);

