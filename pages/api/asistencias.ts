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
      WITH semanas_validas AS ( 
        SELECT 
            A.usuario_id, 
            A.hora, 
            A.fecha, 
            YEARWEEK(A.fecha, 1) AS semana_iso 
        FROM asistencias A 
        WHERE (A.estado = 1) 
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
        GROUP BY 
            U.id_usuario, U.nombre, U.apellido, 
            U.sueldo, U.aporte, U.descuento 
      ), 
      asistencias_totales AS ( 
        SELECT 
            A.usuario_id, 
            COUNT(*) AS total_asistencias 
        FROM asistencias A 
        WHERE (A.estado = 1) 
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
      INNER JOIN asistencias_totales A ON A.usuario_id = U.id_usuario 
      ORDER BY nombre_completo
    `
    
    const data = await rawQuery(sql) as AsistenciaResumen[];
    
    return res.status(200).json({
      success: true,
      data: data || []
    })
    
  } catch (error) {
    console.error('Error al obtener asistencias:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Error al obtener asistencias',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}