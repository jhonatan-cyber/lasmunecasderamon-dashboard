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
    const { startDate, endDate, tipo } = req.query;

    // Si se solicita tipo 'detalle', devolver propinas individuales
    if (tipo === 'detalle') {
      let queryString = `
        SELECT 
          DP.id_detalle_propina,
          DP.propina_id,
          DP.usuario_id,
          DP.monto,
          DP.fecha_crea,
          P.estado,
          P.fecha_crea AS propina_fecha_crea,
          V.codigo AS codigo_venta
        FROM detalle_propinas DP
        INNER JOIN propinas P ON P.id_propina = DP.propina_id
        LEFT JOIN ventas V ON V.id_venta = P.venta_id
        WHERE DP.usuario_id = ?
      `;

      const queryParams: (number | string)[] = [userId];

      // Agregar filtros de fecha si se proporcionan
      if (startDate && endDate) {
        queryString += ` AND DATE(DP.fecha_crea) BETWEEN ? AND ?`;
        queryParams.push(startDate as string, endDate as string);
      }

      queryString += ` ORDER BY DP.fecha_crea DESC`;

      // Obtener propinas del usuario
      const tips = (await query(queryString, queryParams)) as any[];

      return res.status(200).json({
        success: true,
        data: tips
      });
    }

    // Por defecto, devolver propinas individuales del usuario (formato para dashboard)
    let queryString = `
      SELECT 
        DP.id_detalle_propina,
        DP.propina_id,
        DP.usuario_id,
        DP.monto,
        DP.fecha_crea,
        P.estado,
        P.fecha_crea AS propina_fecha_crea,
        V.codigo AS codigo_venta
      FROM detalle_propinas DP
      INNER JOIN propinas P ON P.id_propina = DP.propina_id
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      WHERE DP.usuario_id = ?
    `;

    const queryParams: (number | string)[] = [userId];

    // Agregar filtros de fecha si se proporcionan
    if (startDate && endDate) {
      queryString += ` AND DATE(DP.fecha_crea) BETWEEN ? AND ?`;
      queryParams.push(startDate as string, endDate as string);
    }

    queryString += ` ORDER BY DP.fecha_crea DESC`;

    // Obtener propinas del usuario
    const tips = (await query(queryString, queryParams)) as any[];

    return res.status(200).json({
      success: true,
      data: tips
    });
  } catch (error) {
    console.error('Error obteniendo propinas del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
