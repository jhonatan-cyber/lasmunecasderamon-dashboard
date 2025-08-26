// pages/api/asistencias/[id]/detalle.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de usuario requerido' });
    }

    const userId = Number(id);

    // Obtener detalles de asistencias con cálculo completo de descuentos
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
      asistencias_detalle AS ( 
        SELECT 
            A.id_asistencia,
            A.usuario_id,
            A.fecha,
            A.hora,
            A.estado,
            U.sueldo,
            U.aporte,
            U.descuento,
            U.semanas_con_descuento,
            (U.sueldo - U.aporte) AS sueldo_final
        FROM asistencias A
        INNER JOIN conteo_semanas U ON U.id_usuario = A.usuario_id
        WHERE A.usuario_id = ?
        ORDER BY A.fecha DESC, A.hora DESC
      )
      SELECT 
        id_asistencia,
        usuario_id,
        fecha,
        hora,
        estado,
        sueldo,
        aporte,
        descuento,
        semanas_con_descuento,
        sueldo_final,
        (semanas_con_descuento * descuento) AS descuento_total,
        (sueldo_final - (semanas_con_descuento * descuento)) AS total_final
      FROM asistencias_detalle
    `;
    
    const asistencias = (await query(sql, [userId, userId, userId])) as any[];

    return res.status(200).json({
      success: true,
      data: asistencias || []
    });

  } catch (error) {
    console.error('Error al obtener detalles de asistencias:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
