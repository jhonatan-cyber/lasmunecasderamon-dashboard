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
    const comisiones = (await query(`
      SELECT 
        'comision' as type, 
        DC.id_detalle_comision as id, 
        COALESCE(V.codigo, S.codigo) as codigo, 
        DC.fecha_crea as date, 
        DC.comision as amount, 
        DC.estado,
        CASE 
          WHEN C.venta_id IS NOT NULL THEN 'venta'
          WHEN C.servicio_id IS NOT NULL THEN 'servicio'
          ELSE 'general'
        END as subType
      FROM detalle_comisiones DC
      INNER JOIN comisiones C ON C.id_comision = DC.comision_id
      LEFT JOIN ventas V ON V.id_venta = C.venta_id
      LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
      WHERE DC.usuario_id = ?
    `, [userId])) as any[];
    const asistencias = (await query(`
      SELECT 'asistencia' as type, A.id_asistencia as id, '' as codigo, CONCAT(A.fecha, ' ', A.hora) as date, (U.sueldo - U.aporte) as amount, A.estado
      FROM asistencias A
      INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      WHERE A.usuario_id = ?
    `, [userId])) as any[];

    const anticipos = (await query(`
      SELECT 'anticipo' as type, A.id_anticipo as id, '' as codigo, A.fecha_crea as date, A.monto as amount, A.estado
      FROM anticipos A
      WHERE A.usuario_id = ?
    `, [userId])) as any[];

    const propinas = (await query(`
      SELECT 
        'propina' as type, 
        DP.id_detalle_propina as id, 
        COALESCE(V.codigo, 'TIPS') as codigo, 
        DP.fecha_crea as date, 
        DP.monto as amount, 
        DP.estado,
        CASE 
          WHEN P.venta_id IS NOT NULL THEN 'venta'
          ELSE 'general'
        END as subType
      FROM detalle_propinas DP
      INNER JOIN propinas P ON P.id_propina = DP.propina_id
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      WHERE DP.usuario_id = ?
    `, [userId])) as any[];

    const allEvents = [
      ...comisiones,
      ...asistencias,
      ...anticipos,
      ...propinas
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({
      success: true,
      data: allEvents
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
