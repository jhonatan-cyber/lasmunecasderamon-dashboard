/* eslint-disable */
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

    // Primero intentar consulta completa
    let ventasTragosChicas;
    try {
      // Obtener ventas básicas que tengan comisiones (sin multiplicar por JOINs)
      const ventasBasicas = await query(`
        SELECT 
          COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
          COALESCE(SUM(DISTINCT v.propina), 0) as propinas
        FROM ventas v
        INNER JOIN comisiones c ON c.venta_id = v.id_venta
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
                LOWER(p2.nombre) LIKE '%shampage%' OR
                LOWER(p2.nombre) LIKE '%champan%'
              )
          )
      `, [caja_id, caja_id]);

      // Obtener monto de productos (sin multiplicar)
      const montoProductos = await query(`
        SELECT 
          COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_productos
        FROM ventas v
        INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
        INNER JOIN comisiones c ON c.venta_id = v.id_venta
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
                LOWER(p2.nombre) LIKE '%shampage%' OR
                LOWER(p2.nombre) LIKE '%champan%'
              )
          )
      `, [caja_id, caja_id]);

      // Obtener comisiones (sin multiplicar)
      const comisiones = await query(`
        SELECT 
          COALESCE(SUM(dc.comision), 0) as comisiones
        FROM comisiones c
        INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
        WHERE c.venta_id IN (
          SELECT DISTINCT v.id_venta
          FROM ventas v
          INNER JOIN comisiones c2 ON c2.venta_id = v.id_venta
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
                  LOWER(p2.nombre) LIKE '%shampage%' OR
                  LOWER(p2.nombre) LIKE '%champan%'
                )
            )
        )
      `, [caja_id, caja_id]);

      // Calcular monto_productos neto (productos - propinas - comisiones)
      const montoProductosNeto = ((montoProductos as any[])[0]?.monto_productos || 0) -
        ((ventasBasicas as any[])[0]?.propinas || 0) -
        ((comisiones as any[])[0]?.comisiones || 0);

      ventasTragosChicas = [{
        total_venta: (ventasBasicas as any[])[0]?.total_venta || 0,
        monto_productos: Math.max(0, montoProductosNeto), // Asegurar que no sea negativo
        comisiones: (comisiones as any[])[0]?.comisiones || 0,
        propinas: (ventasBasicas as any[])[0]?.propinas || 0
      }];
    } catch (queryError) {

      ventasTragosChicas = await query(`
        SELECT 
          COALESCE(SUM(v.total), 0) as total_venta,
          COALESCE(SUM(v.total - COALESCE(v.propina, 0)), 0) as monto_productos,
          0 as comisiones,
          COALESCE(SUM(v.propina), 0) as propinas
        FROM ventas v
        WHERE v.caja_id = ?
      `, [caja_id]);
    }

    const resultado = (ventasTragosChicas as any[])[0] || { total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 };

    return res.status(200).json({
      success: true,
      total_venta: resultado.total_venta,
      monto_productos: resultado.monto_productos,
      comisiones: resultado.comisiones,
      propinas: resultado.propinas
    });

  } catch (error) {

    return res.status(200).json({
      success: true,
      total_venta: 0,
      monto_productos: 0,
      comisiones: 0,
      propinas: 0,
      message: 'Error en consulta, devolviendo valores por defecto'
    });
  }
}
