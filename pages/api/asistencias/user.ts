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
          U.sueldo,
          U.aporte,
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

      sql += ` ORDER BY A.fecha DESC`;

      const asistencias = (await query(sql, queryParams)) as any[];

      return res.status(200).json({
        success: true,
        data: asistencias
      });
    }

    // Por defecto, devolver resumen de asistencias
    const sql = `
      WITH semanas_validas AS ( 
        SELECT 
            A.usuario_id, 
            A.hora, 
            A.fecha, 
            YEARWEEK(A.fecha, 1) AS semana_iso 
        FROM asistencias A 
        WHERE (A.estado = 1) 
          AND A.usuario_id = ?
          AND DAYOFWEEK(A.fecha) IN (3, 4, 5, 6, 7, 1) 
        GROUP BY A.usuario_id, YEARWEEK(A.fecha, 1) 
      ), 
      conteo_semanas AS ( 
        SELECT 
            U.id_usuario, 
            U.nombre, 
            U.nick, 
            U.apellido, 
            U.sueldo, 
            U.aporte, 
            U.descuento, 
            COUNT(DISTINCT S.semana_iso) AS semanas_con_descuento 
        FROM usuarios U 
        LEFT JOIN semanas_validas S ON S.usuario_id = U.id_usuario 
        WHERE U.id_usuario = ?
        GROUP BY 
            U.id_usuario, U.nombre, U.apellido, 
            U.sueldo, U.aporte, U.descuento 
      ), 
      asistencias_totales AS ( 
        SELECT 
            A.usuario_id, 
            COUNT(*) AS total_asistencias 
        FROM asistencias A 
        WHERE (A.estado = 1) AND A.usuario_id = ?
        GROUP BY A.usuario_id 
      ) 
      SELECT 
        U.id_usuario, 
        U.nick, 
        CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo, 
        COALESCE(A.total_asistencias, 0) AS total_asistencias, 
        COALESCE(A.total_asistencias, 0) * U.sueldo AS sueldo_total, 
        COALESCE(A.total_asistencias, 0) * U.aporte AS aporte_total, 
        COALESCE(U.semanas_con_descuento, 0) * U.descuento AS descuento_total, 
        (COALESCE(A.total_asistencias, 0) * U.sueldo) 
        - (COALESCE(A.total_asistencias, 0) * U.aporte) 
        - (COALESCE(U.semanas_con_descuento, 0) * U.descuento) AS total_final 
      FROM conteo_semanas U 
      LEFT JOIN asistencias_totales A ON A.usuario_id = U.id_usuario 
      ORDER BY nombre_completo
    `;
    
    const data = await query(sql, [userId, userId, userId]) as any[];

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error al obtener asistencias del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
