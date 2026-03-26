import { query } from '@/lib/database/db';

export interface VentasBarrasResult {
  total_venta: number;
  monto_productos: number;
  propinas: number;
}

export interface VentasChampagneResult {
  total_venta: number;
  monto_champagne: number;
  comisiones: number;
  propinas: number;
}

export interface VentasTragosChicasResult {
  total_venta: number;
  monto_productos: number;
  comisiones: number;
  propinas: number;
}

export class VentasStatsRepository {
  static async getVentasBarras(caja_id: string): Promise<VentasBarrasResult> {
    const results = await query<any[]>(`
      SELECT 
        COALESCE(SUM(v.total), 0) as total_venta,
        COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_productos,
        COALESCE(SUM(v.propina), 0) as propinas
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      -- Optimization: Use LEFT JOIN to exclude sales with commissions
      LEFT JOIN comisiones c ON v.id_venta = c.venta_id
      WHERE v.caja_id = ?
        AND c.id_comision IS NULL -- No commissions (not a trago chica)
        AND NOT EXISTS (
          -- Exclude champagne sales
          SELECT 1 FROM detalle_ventas dv2
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE dv2.venta_id = v.id_venta
            AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
        )
    `, [caja_id]);

    const row = results[0] || { total_venta: 0, monto_productos: 0, propinas: 0 };
    return {
      total_venta: Number(row.total_venta),
      monto_productos: Number(row.monto_productos),
      propinas: Number(row.propinas)
    };
  }

  static async getVentasChampagne(caja_id: string): Promise<VentasChampagneResult> {
    const results = await query<any[]>(`
      SELECT 
        COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.propina), 0) as propinas,
        (
          SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
          FROM detalle_ventas dv
          INNER JOIN productos p ON p.id_producto = dv.producto_id
          WHERE dv.venta_id = v.id_venta
            AND (LOWER(p.nombre) REGEXP 'champagne|champaña|shampage|champan')
        ) as monto_champagne,
        (
          SELECT COALESCE(SUM(dc.comision), 0)
          FROM comisiones c
          INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
          WHERE c.venta_id = v.id_venta
        ) as comisiones
      FROM ventas v
      WHERE v.caja_id = ?
        AND EXISTS (
          SELECT 1 FROM detalle_ventas dv2
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE dv2.venta_id = v.id_venta
            AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
        )
      GROUP BY v.id_venta
    `, [caja_id]);

    const stats = results.reduce((acc, row) => ({
      total_venta: acc.total_venta + Number(row.total_venta),
      monto_champagne: acc.monto_champagne + Number(row.monto_champagne),
      comisiones: acc.comisiones + Number(row.comisiones),
      propinas: acc.propinas + Number(row.propinas)
    }), { total_venta: 0, monto_champagne: 0, comisiones: 0, propinas: 0 });

    return stats;
  }

  static async getVentasTragosChicas(caja_id: string): Promise<VentasTragosChicasResult> {
    const results = await query<any[]>(`
      SELECT 
        COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.propina), 0) as propinas,
        (
          SELECT COALESCE(SUM(dc.comision), 0)
          FROM comisiones c
          INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
          WHERE c.venta_id = v.id_venta
        ) as comisiones,
        (
          SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
          FROM detalle_ventas dv
          WHERE dv.venta_id = v.id_venta
        ) as monto_productos
      FROM ventas v
      INNER JOIN comisiones c ON c.venta_id = v.id_venta
      WHERE v.caja_id = ?
        AND NOT EXISTS (
          -- Exclude champagne sales
          SELECT 1 FROM detalle_ventas dv2
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE dv2.venta_id = v.id_venta
            AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
        )
      GROUP BY v.id_venta
    `, [caja_id]);

    const stats = results.reduce((acc, row) => {
      const comisiones = Number(row.comisiones || 0);
      const propinas = Number(row.propinas || 0);
      const montoProductos = Number(row.monto_productos || 0);
      
      return {
        total_venta: acc.total_venta + Number(row.total_venta),
        monto_productos: acc.monto_productos + Math.max(0, montoProductos - propinas - comisiones),
        comisiones: acc.comisiones + comisiones,
        propinas: acc.propinas + propinas
      };
    }, { total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 });

    return stats;
  }
}
