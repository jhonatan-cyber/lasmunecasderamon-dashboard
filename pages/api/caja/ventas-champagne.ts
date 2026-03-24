/* eslint-disable @typescript-eslint/no-explicit-any */
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


    // Primero obtener las ventas de champagne básicas (sin JOINs que multipliquen)
    const ventasChampagneBasicas = await query(`
      SELECT 
        COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.propina), 0) as propinas
      FROM ventas v
      WHERE v.caja_id = ?
        AND v.id_venta IN (
          -- Incluir solo ventas que contengan productos con champagne/champaña
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

    // Obtener el monto de productos de champagne (solo productos de champagne)
    const montoChampagne = await query(`
      SELECT 
        COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_champagne
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.caja_id = ?
        AND v.id_venta IN (
          -- Incluir solo ventas que contengan productos con champagne/champaña
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
        AND (
          LOWER(p.nombre) LIKE '%champagne%' OR
          LOWER(p.nombre) LIKE '%champaña%' OR
          LOWER(p.nombre) LIKE '%shampage%' OR
          LOWER(p.nombre) LIKE '%champan%'
        )
    `, [caja_id, caja_id]);

    // Obtener las comisiones de ventas de champagne (sin multiplicar)
    const comisionesChampagne = await query(`
      SELECT 
        COALESCE(SUM(dc.comision), 0) as comisiones
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
      WHERE c.venta_id IN (
        -- Solo ventas que contengan productos con champagne/champaña
        SELECT DISTINCT v.id_venta
        FROM ventas v
        INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
        INNER JOIN productos p ON p.id_producto = dv.producto_id
        WHERE v.caja_id = ?
          AND (
            LOWER(p.nombre) LIKE '%champagne%' OR
            LOWER(p.nombre) LIKE '%champaña%' OR
            LOWER(p.nombre) LIKE '%shampage%' OR
            LOWER(p.nombre) LIKE '%champan%'
          )
      )
    `, [caja_id]);

    const resultado = {
      total_venta: (ventasChampagneBasicas as any[])[0]?.total_venta || 0,
      monto_champagne: (montoChampagne as any[])[0]?.monto_champagne || 0,
      comisiones: (comisionesChampagne as any[])[0]?.comisiones || 0,
      propinas: (ventasChampagneBasicas as any[])[0]?.propinas || 0
    };


    return res.status(200).json({
      success: true,
      total_venta: resultado.total_venta,
      monto_champagne: resultado.monto_champagne,
      comisiones: resultado.comisiones,
      propinas: resultado.propinas
    });

  } catch (error) {
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: (error as Error).message
    });
  }
}
