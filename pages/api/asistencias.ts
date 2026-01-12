// pages/api/asistencias.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { rawQuery } from '@/lib/db'
import { AsistenciaResponse, AsistenciaResumen } from '@/types/asistencia'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AsistenciaResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      data: [], // Añadimos un array vacío
      error: 'Método no permitido' 
    });
  }

  try {
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
      ORDER BY nombre_completo
    `
    
    const data = await rawQuery(sql) as AsistenciaResumen[];
    
    return res.status(200).json({
      success: true,
      data: data || []
    })
    
  } catch (error) {
  
    return res.status(500).json({ 
      success: false,
      error: 'Error al obtener asistencias',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}