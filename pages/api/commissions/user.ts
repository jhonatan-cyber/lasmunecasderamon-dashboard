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

    // Obtener comisiones del usuario (tanto ventas como servicios)
    const commissions = (await query(
      `
     SELECT 
      C.id_comision,
      COALESCE(V.codigo, S.codigo) as codigo,
      DC.comision, 
      DC.fecha_crea, 
      DC.fecha_mod,
      DC.estado,
      CASE 
        WHEN C.venta_id != 0 THEN 'venta'
        WHEN C.servicio_id != 0 THEN 'servicio'
        ELSE 'otro'
      END as tipo
    FROM detalle_comisiones DC 
    INNER JOIN comisiones C ON C.id_comision = DC.comision_id
    LEFT JOIN ventas V ON V.id_venta = C.venta_id
    LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
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
   
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
