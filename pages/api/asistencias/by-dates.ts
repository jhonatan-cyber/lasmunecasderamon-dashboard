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
        A.id_asistencia,
        A.usuario_id,
        A.fecha,
        A.hora,
        A.estado,
        CONCAT(U.nombre, ' ', U.apellido) AS usuario,
        U.sueldo,
        U.aporte,
        A.fecha_pago,
        (U.sueldo - U.aporte) AS sueldo_final
    FROM asistencias A
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
        const placeholders = dateArray.map(() => '?').join(',');
        queryString += ` AND A.fecha IN (${placeholders})`;
        queryParams.push(...dateArray);

      }
    }
    // Si se proporciona rango de fechas
    else if (startDate && endDate) {
      queryString += ` AND A.fecha BETWEEN ? AND ?`;
      queryParams.push(startDate as string, endDate as string);
    }

    queryString += ` ORDER BY A.fecha DESC, A.hora ASC`;



    // Obtener asistencias del usuario
    const attendances = (await query(queryString, queryParams)) as any[];



    // Consulta de prueba para verificar datos del usuario
    const testQuery = `
      SELECT COUNT(*) as total, MIN(fecha) as min_date, MAX(fecha) as max_date
      FROM asistencias 
      WHERE usuario_id = ?
    `;
    const testResult = await query(testQuery, [userId]);


    return res.status(200).json({
      success: true,
      data: attendances,
      count: attendances.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
