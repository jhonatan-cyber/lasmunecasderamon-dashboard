import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { caja_id } = req.query;

    if (!caja_id) {
      return res.status(400).json({ error: 'caja_id es requerido' });
    }

    console.log('🔍 Obteniendo comisiones de ventas sin champagne para caja:', caja_id);

    // Query para obtener comisiones de ventas que NO contengan productos relacionados con champagne
    const comisiones = await query(`
      SELECT 
        COALESCE(SUM(dc.comision), 0) as total_comisiones
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      INNER JOIN comisiones c ON c.venta_id = v.id_venta
      INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.caja_id = ?
        AND v.id_venta NOT IN (
          -- Excluir ventas que contengan productos con champagne/champaña
          SELECT DISTINCT v2.id_venta
          FROM ventas v2
          INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE v2.caja_id = ?
            AND (
              LOWER(p2.nombre) LIKE '%champagne%' OR
              LOWER(p2.nombre) LIKE '%champaña%' OR
              LOWER(p2.nombre) LIKE '%champagne%' OR
              LOWER(p2.nombre) LIKE '%shampage%' OR
              LOWER(p2.nombre) LIKE '%champan%' OR
              LOWER(p2.nombre) LIKE '%champan%'
            )
        )
    `, [caja_id, caja_id]);

    const totalComisiones = comisiones[0]?.total_comisiones || 0;

    console.log('📊 Comisiones sin champagne obtenidas:', totalComisiones);

    return res.status(200).json({
      success: true,
      total: totalComisiones
    });

  } catch (error) {
    console.error('❌ Error obteniendo comisiones sin champagne:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: (error as Error).message
    });
  }
}