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
    // Usamos agregaciones con LEFT JOIN para mayor compatibilidad y rendimiento.
    // Evitamos YEARWEEK y contamos semanas con YEAR + WEEK (modo 1: semana inicia lunes).
    const sql = `
      SELECT 
        U.id_usuario,
        U.nick,
        CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
        COALESCE(ASIS.total_asistencias, 0) AS total_asistencias,
        COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0) AS sueldo_total,
        COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0) AS aporte_total,
        0 AS descuento_total,
        (
          COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0)
        ) - (
          COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0)
        ) AS total_final
      FROM usuarios U
      LEFT JOIN (
        SELECT usuario_id, COUNT(*) AS total_asistencias
        FROM asistencias
        WHERE estado = 1
        GROUP BY usuario_id
      ) AS ASIS ON ASIS.usuario_id = U.id_usuario
      ORDER BY nombre_completo
    `

    const data = await rawQuery(sql) as AsistenciaResumen[];
    
    return res.status(200).json({
      success: true,
      data: data || []
    })
    
  } catch (error) {
    console.error('Error en /api/asistencias:', error);
    
    return res.status(500).json({ 
      success: false,
      error: 'Error al obtener asistencias',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}