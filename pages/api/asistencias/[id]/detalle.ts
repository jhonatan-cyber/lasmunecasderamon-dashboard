// pages/api/asistencias/[id]/detalle.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { rawQuery } from '@/lib/db';

interface AsistenciaDetalle {
  id_asistencia: number;
  fecha: string;
  hora: string;
  estado: string;
  sueldo: number;
  aporte: number;
  sueldo_final: number;
}

interface DetalleResponse {
  success: boolean;
  data?: AsistenciaDetalle[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DetalleResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });
  }

  const { id } = req.query;
  const userId = parseInt(id as string);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'ID de usuario inválido'
    });
  }

  try {
    const sql = `
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
      WHERE A.usuario_id = ${userId}
      ORDER BY A.fecha DESC
    `;

    const rawData = await rawQuery(sql);

    // Transformar los datos para que coincidan con la interfaz esperada
    const transformedData = (rawData as any[]).map((item: any) => ({
      id_asistencia: item.id_asistencia,
      fecha: item.fecha,
      hora: item.hora,
      estado: item.estado, // Mantener como número: 1 = Por Pagar, 0 = Pagado
      sueldo: item.sueldo,
      aporte: item.aporte,
      sueldo_final: item.sueldo_final
    }));

    return res.status(200).json({
      success: true,
      data: transformedData || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener detalle de asistencias'
    });
  }
}
