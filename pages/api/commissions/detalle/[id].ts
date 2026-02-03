import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID de usuario requerido' });
  }

  try {
    // Obtener detalles de comisiones por ventas y servicios
    const detallesQuery = `
      SELECT 
        C.id_comision,
        C.fecha_crea as fecha_hora,
        CASE 
          WHEN C.venta_id IS NOT NULL THEN V.codigo
          ELSE NULL
        END as codigo_venta,
        CASE 
          WHEN C.servicio_id IS NOT NULL THEN S.codigo
          ELSE NULL
        END as codigo_servicio,
        CASE 
          WHEN C.venta_id IS NOT NULL THEN 'venta'
          WHEN C.servicio_id IS NOT NULL THEN 'servicio'
          ELSE 'desconocido'
        END as tipo,
        DC.comision as monto,
        CASE 
          WHEN C.estado = 1 THEN 'Por pagar'
          WHEN C.estado = 0 THEN 'Pagado'
          ELSE 'Anulado'
        END as estado,
        DC.fecha_mod as fecha_pago,
        CASE 
          WHEN C.venta_id IS NOT NULL THEN (
            SELECT GROUP_CONCAT(p.nombre SEPARATOR ', ')
            FROM detalle_ventas dv
            JOIN productos p ON dv.producto_id = p.id_producto
            WHERE dv.venta_id = C.venta_id AND (dv.hostess_id = DC.usuario_id OR (dv.hostess_id IS NULL AND dv.comision > 0))
          )
          WHEN C.servicio_id IS NOT NULL THEN 'Servicio de Habitación'
          ELSE 'Comisión'
        END as producto,
        CASE 
          WHEN C.venta_id IS NOT NULL THEN CONCAT('Venta - ', V.codigo)
          WHEN C.servicio_id IS NOT NULL THEN CONCAT('Servicio - ', S.codigo)
          ELSE 'Comisión'
        END as descripcion
      FROM comisiones C
      INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
      LEFT JOIN ventas V ON V.id_venta = C.venta_id
      LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
      WHERE DC.usuario_id = ?
        AND DC.comision > 0
      ORDER BY C.fecha_crea DESC
    `;

    const detalles = await query(detallesQuery, [id]);

    res.status(200).json({
      success: true,
      data: detalles,
      message: 'Detalles de comisiones obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener detalles de comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
