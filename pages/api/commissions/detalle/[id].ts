import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { id } = req.query;
  const requestId = Array.isArray(id) ? id[0] : id;

  if (!requestId || requestId === 'undefined' || requestId === 'null') {
    return res.status(400).json({ success: false, message: 'ID de usuario es requerido y debe ser válido' });
  }
  
  const idToLog = String(requestId);

  try {
    // DEBUG: Comprobar si existen registros en detalle_comisiones independientemente de la tabla comisiones
    const testDC = await query('SELECT count(*) as count FROM detalle_comisiones WHERE usuario_id = ?', [requestId]);
    console.log('[Detalle API] Registros en detalle_comisiones sin join:', testDC[0].count);

    // Obtener detalles de comisiones por ventas y servicios
    const detallesQuery = `
      SELECT 
        C.id_comision,
        C.fecha_crea as fecha_hora,
        V.codigo as codigo_venta,
        S.codigo as codigo_servicio,
        CASE 
          WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN 'venta'
          WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN 'servicio'
          ELSE 'otro'
        END as tipo,
        DC.comision as monto,
        CASE 
          WHEN C.estado = 1 THEN 'Por pagar'
          WHEN C.estado = 0 THEN 'Pagado'
          ELSE 'Anulado'
        END as estado,
        DC.fecha_mod as fecha_pago,
        CASE 
          WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN (
            SELECT p.nombre
            FROM detalle_ventas dv
            JOIN productos p ON dv.producto_id = p.id_producto
            WHERE dv.venta_id = C.venta_id 
            LIMIT 1
          )
          WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN 'Servicio de Habitación'
          ELSE 'Comisión Especial'
        END as producto,
        CASE 
          WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN CONCAT('Venta - ', V.codigo)
          WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN CONCAT('Servicio - ', S.codigo)
          ELSE 'Comisión Directa'
        END as descripcion
      FROM comisiones C
      INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
      LEFT JOIN ventas V ON V.id_venta = C.venta_id
      LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
      WHERE DC.usuario_id = ?
        AND DC.comision > 0
      ORDER BY C.fecha_crea DESC
    `;

    console.log('[Detalle API] Al buscar detalles para ID:', requestId);
    const detalles = await query(detallesQuery, [requestId]);
    console.log('[Detalle API] Detalles encontrados:', detalles.length);

    res.status(200).json({
      success: true,
      data: detalles,
      message: `Detalles para ID ${requestId} obtenidos correctamente. Total: ${detalles.length}`
    });
  } catch (error) {
    console.error('Error al obtener detalles de comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
