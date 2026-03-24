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

    // Obtener comisiones del usuario (tanto ventas como servicios) - todas las comisiones
    const commissions = (await query(
      `
     SELECT 
      C.id_comision,
      COALESCE(V.codigo, S.codigo) as codigo,
      DC.comision, 
      DC.fecha_crea, 
      DC.fecha_mod,
      DC.estado,
      COALESCE(V.total, S.total) as total_original,
      CASE 
        WHEN C.venta_id IS NOT NULL THEN 'venta'
        WHEN C.servicio_id IS NOT NULL THEN 'servicio'
        ELSE 'otro'
      END as tipo,
      CLI.nombre as cliente_nombre,
      HAB.nombre as habitacion_nombre,
      (
        SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('nombre', P.nombre, 'cantidad', DV.cantidad, 'precio', P.precio)), ']')
        FROM detalle_ventas DV
        JOIN productos P ON P.id_producto = DV.producto_id
        WHERE DV.venta_id = V.id_venta
      ) as productos
    FROM detalle_comisiones DC 
    INNER JOIN comisiones C ON C.id_comision = DC.comision_id
    LEFT JOIN ventas V ON V.id_venta = C.venta_id
    LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
    LEFT JOIN clientes CLI ON CLI.id_cliente = V.cliente_id
    LEFT JOIN habitaciones HAB ON HAB.id_habitacion = V.habitacion_id
    WHERE DC.usuario_id = ?
    ORDER BY DC.fecha_crea DESC
    `,
      [userId]
    )) as any[];

    return res.status(200).json({
      success: true,
      data: commissions
    });
  } catch (error) {
    console.error('[/api/commissions/user]', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);

