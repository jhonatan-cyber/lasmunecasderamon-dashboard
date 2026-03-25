import { query } from '@/lib/db';

export class VentasStatsRepository {
  static async getVentasBarras(caja_id: string) {
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
            SELECT DISTINCT c.venta_id
            FROM comisiones c
            WHERE c.venta_id IS NOT NULL
          )
          AND v.id_venta NOT IN (
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
            SELECT DISTINCT c.venta_id
            FROM comisiones c
            WHERE c.venta_id IS NOT NULL
          )
      `, [caja_id]);
    }
    return (ventasBarras as any[])[0] || { total_venta: 0, monto_productos: 0, propinas: 0 };
  }

  static async getVentasChampagne(caja_id: string) {
    const ventasChampagneBasicas = await query(`
      SELECT 
        COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.propina), 0) as propinas
      FROM ventas v
      WHERE v.caja_id = ?
        AND v.id_venta IN (
          SELECT DISTINCT v2.id_venta
          FROM ventas v2
          INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE v2.caja_id = ?
            AND (
              LOWER(p2.nombre) LIKE '%champagne%' OR LOWER(p2.nombre) LIKE '%champaña%' OR
              LOWER(p2.nombre) LIKE '%shampage%' OR LOWER(p2.nombre) LIKE '%champan%'
            )
        )
    `, [caja_id, caja_id]);

    const montoChampagne = await query(`
      SELECT 
        COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_champagne
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.caja_id = ?
        AND v.id_venta IN (
          SELECT DISTINCT v2.id_venta
          FROM ventas v2
          INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE v2.caja_id = ?
            AND (
              LOWER(p2.nombre) LIKE '%champagne%' OR LOWER(p2.nombre) LIKE '%champaña%' OR
              LOWER(p2.nombre) LIKE '%shampage%' OR LOWER(p2.nombre) LIKE '%champan%'
            )
        )
        AND (
          LOWER(p.nombre) LIKE '%champagne%' OR LOWER(p.nombre) LIKE '%champaña%' OR
          LOWER(p.nombre) LIKE '%shampage%' OR LOWER(p.nombre) LIKE '%champan%'
        )
    `, [caja_id, caja_id]);

    const comisionesChampagne = await query(`
      SELECT 
        COALESCE(SUM(dc.comision), 0) as comisiones
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
      WHERE c.venta_id IN (
        SELECT DISTINCT v.id_venta
        FROM ventas v
        INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
        INNER JOIN productos p ON p.id_producto = dv.producto_id
        WHERE v.caja_id = ?
          AND (
            LOWER(p.nombre) LIKE '%champagne%' OR LOWER(p.nombre) LIKE '%champaña%' OR
            LOWER(p.nombre) LIKE '%shampage%' OR LOWER(p.nombre) LIKE '%champan%'
          )
      )
    `, [caja_id]);

    return {
      total_venta: (ventasChampagneBasicas as any[])[0]?.total_venta || 0,
      monto_champagne: (montoChampagne as any[])[0]?.monto_champagne || 0,
      comisiones: (comisionesChampagne as any[])[0]?.comisiones || 0,
      propinas: (ventasChampagneBasicas as any[])[0]?.propinas || 0
    };
  }

  static async getVentasTragosChicas(caja_id: string) {
    let ventasTragosChicas;
    try {
      const ventasBasicas = await query(`
        SELECT 
          COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
          COALESCE(SUM(DISTINCT v.propina), 0) as propinas
        FROM ventas v
        INNER JOIN comisiones c ON c.venta_id = v.id_venta
        WHERE v.caja_id = ?
          AND v.id_venta NOT IN (
            SELECT DISTINCT v2.id_venta
            FROM ventas v2
            INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
            INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
            WHERE v2.caja_id = ?
              AND (
                LOWER(p2.nombre) LIKE '%champagne%' OR LOWER(p2.nombre) LIKE '%champaña%' OR
                LOWER(p2.nombre) LIKE '%shampage%' OR LOWER(p2.nombre) LIKE '%champan%'
              )
          )
      `, [caja_id, caja_id]);

      const montoProductos = await query(`
        SELECT 
          COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_productos
        FROM ventas v
        INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
        INNER JOIN comisiones c ON c.venta_id = v.id_venta
        WHERE v.caja_id = ?
          AND v.id_venta NOT IN (
            SELECT DISTINCT v2.id_venta
            FROM ventas v2
            INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
            INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
            WHERE v2.caja_id = ?
              AND (
                LOWER(p2.nombre) LIKE '%champagne%' OR LOWER(p2.nombre) LIKE '%champaña%' OR
                LOWER(p2.nombre) LIKE '%shampage%' OR LOWER(p2.nombre) LIKE '%champan%'
              )
          )
      `, [caja_id, caja_id]);

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
              SELECT DISTINCT v2.id_venta
              FROM ventas v2
              INNER JOIN detalle_ventas dv2 ON v2.id_venta = dv2.venta_id
              INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
              WHERE v2.caja_id = ?
                AND (
                  LOWER(p2.nombre) LIKE '%champagne%' OR LOWER(p2.nombre) LIKE '%champaña%' OR
                  LOWER(p2.nombre) LIKE '%shampage%' OR LOWER(p2.nombre) LIKE '%champan%'
                )
            )
        )
      `, [caja_id, caja_id]);

      const montoProductosNeto = ((montoProductos as any[])[0]?.monto_productos || 0) -
        ((ventasBasicas as any[])[0]?.propinas || 0) - ((comisiones as any[])[0]?.comisiones || 0);

      ventasTragosChicas = [{
        total_venta: (ventasBasicas as any[])[0]?.total_venta || 0,
        monto_productos: Math.max(0, montoProductosNeto),
        comisiones: (comisiones as any[])[0]?.comisiones || 0,
        propinas: (ventasBasicas as any[])[0]?.propinas || 0
      }];
    } catch {
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
    return (ventasTragosChicas as any[])[0] || { total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 };
  }
}
