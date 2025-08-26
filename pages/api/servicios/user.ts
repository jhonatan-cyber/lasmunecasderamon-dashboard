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

    // Obtener servicios del usuario (todos los estados)
    const servicios = (await query(
      `
     SELECT 
        S.id_servicio, 
        S.codigo, 
        S.tiempo, 
        S.fecha_crea, 
        S.precio_servicio, 
        H.nombre AS habitacion, 
        GROUP_CONCAT(U.nick SEPARATOR ', ') AS anfitriona,
        CONCAT(CL.nombre, ' ', CL.apellido) AS cliente, 
        GROUP_CONCAT(U.id_usuario SEPARATOR ', ') AS anfitrionaId,
        S.estado
    FROM servicios S
    INNER JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
    INNER JOIN clientes CL ON CL.id_cliente = S.cliente_id
    INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
    INNER JOIN usuarios U ON U.id_usuario = DS.usuario_id
    WHERE S.id_servicio IN (
        SELECT servicio_id FROM detalle_servicios WHERE usuario_id = ?
    )
    GROUP BY S.id_servicio
    ORDER BY S.fecha_crea ASC
      `,
      [userId]
    )) as any[];

    return res.status(200).json({
      success: true,
      data: servicios
    });
  } catch (error) {
 
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
