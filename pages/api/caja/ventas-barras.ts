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
    let ventasBarras;
    try {
      ventasBarras = await query(`
        SELECT 
          COALESCE(SUM(v.total), 0) as total_venta,
          COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_productos,
          COALESCE(SUM(v.propina), 0) as propinas
        FROM ventas v
        INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
        INNER JOIN productos p ON p.id_producto = dv.producto_id
        WHERE v.caja_id = ?
          AND v.id_venta NOT IN (
            -- Excluir ventas que tengan comisiones (tragos chicas)
            SELECT DISTINCT c.venta_id
            FROM comisiones c
            WHERE c.venta_id IS NOT NULL
          )
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
                LOWER(p2.nombre) LIKE '%shampage%' OR
                LOWER(p2.nombre) LIKE '%champan%'
              )
          )
      `, [caja_id, caja_id]);
    } catch (queryError) {
 
      ventasBarras = await query(`
        SELECT 
          COALESCE(SUM(v.total), 0) as total_venta,
          COALESCE(SUM(v.total - COALESCE(v.propina, 0)), 0) as monto_productos,
          COALESCE(SUM(v.propina), 0) as propinas
        FROM ventas v
        WHERE v.caja_id = ?
          AND v.id_venta NOT IN (
            -- Excluir ventas que tengan comisiones
            SELECT DISTINCT c.venta_id
            FROM comisiones c
            WHERE c.venta_id IS NOT NULL
          )
      `, [caja_id]);
    }

    const resultado = (ventasBarras as any)[0] || { total_venta: 0, monto_productos: 0, propinas: 0 };

    return res.status(200).json({
      success: true,
      total_venta: resultado.total_venta,
      monto_productos: resultado.monto_productos,
      propinas: resultado.propinas
    });

  } catch (error) {
    
    return res.status(200).json({
      success: true,
      total_venta: 0,
      monto_productos: 0,
      propinas: 0,
      message: 'Error en consulta, devolviendo valores por defecto'
    });
  }
}