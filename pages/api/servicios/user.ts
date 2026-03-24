/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const servicios = (await query(
      `
      SELECT
        S.id_servicio, 
        S.codigo, 
        S.tiempo, 
        S.fecha_crea, 
        S.precio_servicio, 
        S.precio_habitacion,
        S.total,
        S.metodo_pago,
        MAX(COALESCE(DC_ME.comision, 0)) as comision_usuario,
        MAX(COALESCE(DC_ME.estado, 1)) as pago_estado,
        H.nombre AS habitacion, 
        GROUP_CONCAT(DISTINCT 
          CASE 
            WHEN U.nick IS NOT NULL AND U.nick != '' THEN U.nick
            ELSE CONCAT(U.nombre, ' ', U.apellido)
          END 
          SEPARATOR ', '
        ) AS anfitriona,
        CONCAT(CL.nombre, ' ', CL.apellido) AS cliente, 
        CASE 
          WHEN MAX(SS.id_solicitud) IS NOT NULL THEN
             CASE 
               WHEN MAX(SS.solicitado_por) = MAX(SS.procesado_por) THEN MAX(CONCAT(U_SOL.nombre, ' ', U_SOL.apellido))
               ELSE CONCAT(MAX(U_SOL.nombre), ' ', MAX(U_SOL.apellido), ' / ', MAX(U_PROC.nombre), ' ', MAX(U_PROC.apellido))
             END
          ELSE CONCAT(MAX(C_USER.nombre), ' ', MAX(C_USER.apellido))
        END AS creado_por,
        S.estado
    FROM servicios S
    INNER JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
    LEFT JOIN clientes CL ON CL.id_cliente = S.cliente_id
    INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
    INNER JOIN usuarios U ON U.id_usuario = DS.usuario_id
    LEFT JOIN usuarios C_USER ON C_USER.id_usuario = S.created_by
    LEFT JOIN solicitudes_servicios SS ON SS.codigo = S.codigo
    LEFT JOIN usuarios U_SOL ON U_SOL.id_usuario = SS.solicitado_por
    LEFT JOIN usuarios U_PROC ON U_PROC.id_usuario = SS.procesado_por
    LEFT JOIN comisiones C_ME ON C_ME.servicio_id = S.id_servicio
    LEFT JOIN detalle_comisiones DC_ME ON DC_ME.comision_id = C_ME.id_comision AND DC_ME.usuario_id = ?
    WHERE S.id_servicio IN (
        SELECT servicio_id FROM detalle_servicios WHERE usuario_id = ?
    )
    GROUP BY S.id_servicio, S.codigo, S.tiempo, S.fecha_crea, S.precio_servicio, S.precio_habitacion, S.total, S.metodo_pago, H.nombre, CL.nombre, CL.apellido, S.estado
    ORDER BY S.fecha_crea DESC
      `,
      [userId, userId]
    )) as any[];

    return res.status(200).json({
      success: true,
      data: servicios
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);

