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
    const { startDate, endDate, dates, tipo } = req.query;

    // Si se solicita tipo 'detalle', devolver asistencias individuales
    if (tipo === 'detalle') {
      let sql = `
        SELECT 
          A.id_asistencia,
          A.usuario_id,
          A.fecha,
          A.hora,
          A.fecha_pago,
          U.sueldo,
          U.aporte,
          (U.sueldo - U.aporte) AS total,
          A.estado
        FROM asistencias A
        INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
        WHERE A.usuario_id = ?
      `;

      const queryParams: (number | string)[] = [userId];

      // Agregar filtros de fecha si se proporcionan
      if (startDate && endDate) {
        sql += ` AND DATE(A.fecha) BETWEEN ? AND ?`;
        queryParams.push(startDate as string, endDate as string);
      }

      sql += ` ORDER BY A.fecha DESC, A.hora DESC`;

      const asistencias = (await query(sql, queryParams)) as any[];

      return res.status(200).json({
        success: true,
        data: asistencias
      });
    }

    // Por defecto, devolver resumen de asistencias (compatible con MySQL 5.7/MariaDB)
    const sql = `
      SELECT 
        U.id_usuario,
        U.nick,
        CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
        COALESCE((
          SELECT COUNT(*) FROM asistencias A 
          WHERE A.estado = 1 AND A.usuario_id = U.id_usuario
        ), 0) AS total_asistencias,
        COALESCE((
          SELECT COUNT(*) FROM asistencias A 
          WHERE A.estado = 1 AND A.usuario_id = U.id_usuario
        ), 0) * U.sueldo AS sueldo_total,
        COALESCE((
          SELECT COUNT(*) FROM asistencias A 
          WHERE A.estado = 1 AND A.usuario_id = U.id_usuario
        ), 0) * U.aporte AS aporte_total,
        COALESCE((
          SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) 
          FROM asistencias A 
          WHERE A.estado = 1 
            AND A.usuario_id = U.id_usuario 
            AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)
        ), 0) * U.descuento AS descuento_total,
        (
          COALESCE((
            SELECT COUNT(*) FROM asistencias A 
            WHERE A.estado = 1 AND A.usuario_id = U.id_usuario
          ), 0) * U.sueldo
        ) - (
          COALESCE((
            SELECT COUNT(*) FROM asistencias A 
            WHERE A.estado = 1 AND A.usuario_id = U.id_usuario
          ), 0) * U.aporte
        ) - (
          COALESCE((
            SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) 
            FROM asistencias A 
            WHERE A.estado = 1 
              AND A.usuario_id = U.id_usuario 
              AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)
          ), 0) * U.descuento
        ) AS total_final
      FROM usuarios U
      WHERE U.id_usuario = ?
      ORDER BY nombre_completo
    `;
    
    const data = await query(sql, [userId]) as any[];

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);

