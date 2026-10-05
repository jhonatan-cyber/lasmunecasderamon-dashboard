import { query } from '@/lib/database/db';

export interface ShotsVendidos {
  monto: number;
  cantidad: number;
}

export interface VentasBarrasResult {
  total_venta: number;
  cargo_tarjeta: number;
  monto_productos: number;
  propinas: number;
  /**
   * Shots servidos en la caja, separados por a quién se le cobró (migración 039). Es un
   * corte transversal: su monto ya está dentro de alguna de las bolsas de arriba
   * (barras, tragos chicas o champañas), así que NO se suma a los totales.
   */
  shots_cliente: ShotsVendidos;
  shots_anfitriona: ShotsVendidos;
}

export interface VentasChampagneResult {
  total_venta: number;
  cargo_tarjeta: number;
  monto_champagne: number;
  comisiones: number;
  propinas: number;
}

export interface VentasTragosChicasResult {
  total_venta: number;
  cargo_tarjeta: number;
  monto_productos: number;
  comisiones: number;
  propinas: number;
}

export interface VentaProductoRow {
  producto: string;
  unidades: number;
  monto: number;
}

export class VentasStatsRepository {
  /**
   * Shots de la caja partidos por precio (cliente / anfitriona). Corte transversal a
   * propósito: un shot puede caer en cualquier bolsa (una botella vendida en el bar, un
   * trago de chica con comisión, una champaña), y lo que interesa es cuánto entró por
   * shots, no a qué bolsa pertenece cada uno.
   */
  static async getShotsVendidos(caja_id: string): Promise<{
    cliente: ShotsVendidos;
    anfitriona: ShotsVendidos;
  }> {
    const results = await query<any[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN NOT dv.shot_anfitriona THEN dv.sub_total ELSE 0 END), 0) AS cliente_monto,
        COALESCE(SUM(CASE WHEN NOT dv.shot_anfitriona THEN dv.cantidad ELSE 0 END), 0) AS cliente_cantidad,
        COALESCE(SUM(CASE WHEN dv.shot_anfitriona THEN dv.sub_total ELSE 0 END), 0) AS anfitriona_monto,
        COALESCE(SUM(CASE WHEN dv.shot_anfitriona THEN dv.cantidad ELSE 0 END), 0) AS anfitriona_cantidad
      FROM detalle_ventas dv
      INNER JOIN ventas v ON v.id_venta = dv.venta_id
      WHERE v.caja_id = ?
        AND dv.tipo_venta = 'shot'
    `,
      [caja_id]
    );

    const row = results[0] || {};
    return {
      cliente: {
        monto: Number(row.cliente_monto || 0),
        cantidad: Number(row.cliente_cantidad || 0)
      },
      anfitriona: {
        monto: Number(row.anfitriona_monto || 0),
        cantidad: Number(row.anfitriona_cantidad || 0)
      }
    };
  }

  static async getVentasBarras(caja_id: string): Promise<VentasBarrasResult> {
    const results = await query<any[]>(
      `
      SELECT
        COALESCE(SUM(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) as total_venta,
        COALESCE(SUM(v.cargo_tarjeta), 0) as cargo_tarjeta,
        COALESCE(SUM(v.propina), 0) as propinas,
        COALESCE(SUM((
          SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
          FROM detalle_ventas dv
          WHERE dv.venta_id = v.id_venta
        )), 0) as monto_productos
      FROM ventas v
      LEFT JOIN comisiones c ON v.id_venta = c.venta_id
      WHERE v.caja_id = ?
        AND c.id_comision IS NULL -- No commissions (not a trago chica)
        AND NOT EXISTS (
          -- Exclude champagne sales
          SELECT 1 FROM detalle_ventas dv2
          INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
          WHERE dv2.venta_id = v.id_venta
            AND (LOWER(p2.nombre) ~ 'champagne|champaña|shampage|champan')
        )
    `,
      [caja_id]
    );

    const row = results[0] || { total_venta: 0, cargo_tarjeta: 0, propinas: 0, monto_productos: 0 };
    const shots = await VentasStatsRepository.getShotsVendidos(caja_id);
    return {
      total_venta: Number(row.total_venta),
      cargo_tarjeta: Number(row.cargo_tarjeta || 0),
      monto_productos: Number(row.monto_productos),
      propinas: Number(row.propinas),
      shots_cliente: shots.cliente,
      shots_anfitriona: shots.anfitriona
    };
  }

  static async getVentasChampagne(caja_id: string): Promise<VentasChampagneResult> {
    const results = await query<any[]>(
      `
      SELECT
        COALESCE(SUM(DISTINCT v.total - COALESCE(v.cargo_tarjeta, 0)), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.cargo_tarjeta), 0) as cargo_tarjeta,
        COALESCE(SUM(DISTINCT v.propina), 0) as propinas,
        (
          SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
          FROM detalle_ventas dv
          INNER JOIN productos p ON p.id_producto = dv.producto_id
          WHERE dv.venta_id = v.id_venta
            AND (LOWER(p.nombre) ~ 'champagne|champaña|shampage|champan')
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
            AND (LOWER(p2.nombre) ~ 'champagne|champaña|shampage|champan')
        )
      GROUP BY v.id_venta
    `,
      [caja_id]
    );

    const stats = results.reduce(
      (acc, row) => ({
        total_venta: acc.total_venta + Number(row.total_venta),
        cargo_tarjeta: acc.cargo_tarjeta + Number(row.cargo_tarjeta || 0),
        monto_champagne: acc.monto_champagne + Number(row.monto_champagne),
        comisiones: acc.comisiones + Number(row.comisiones),
        propinas: acc.propinas + Number(row.propinas)
      }),
      { total_venta: 0, cargo_tarjeta: 0, monto_champagne: 0, comisiones: 0, propinas: 0 }
    );

    return stats;
  }

  static async getVentasTragosChicas(caja_id: string): Promise<VentasTragosChicasResult> {
    const results = await query<any[]>(
      `
      SELECT
        COALESCE(SUM(DISTINCT v.total - COALESCE(v.cargo_tarjeta, 0)), 0) as total_venta,
        COALESCE(SUM(DISTINCT v.cargo_tarjeta), 0) as cargo_tarjeta,
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
            AND (LOWER(p2.nombre) ~ 'champagne|champaña|shampage|champan')
        )
      GROUP BY v.id_venta
    `,
      [caja_id]
    );

    const stats = results.reduce(
      (acc, row) => {
        const comisiones = Number(row.comisiones || 0);
        const propinas = Number(row.propinas || 0);
        const montoProductos = Number(row.monto_productos || 0);

        return {
          total_venta: acc.total_venta + Number(row.total_venta),
          cargo_tarjeta: acc.cargo_tarjeta + Number(row.cargo_tarjeta || 0),
          monto_productos:
            acc.monto_productos + Math.max(0, montoProductos - propinas - comisiones),
          comisiones: acc.comisiones + comisiones,
          propinas: acc.propinas + propinas
        };
      },
      { total_venta: 0, cargo_tarjeta: 0, monto_productos: 0, comisiones: 0, propinas: 0 }
    );

    return stats;
  }

  static async getVentasPorProducto(caja_id: string, limit = 10): Promise<VentaProductoRow[]> {
    const results = await query<any[]>(
      `
      SELECT
        p.nombre as producto,
        COALESCE(SUM(dv.cantidad), 0) as unidades,
        COALESCE(SUM(dv.sub_total), 0) as monto
      FROM detalle_ventas dv
      INNER JOIN ventas v ON v.id_venta = dv.venta_id
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.caja_id = ?
        AND v.estado IN (1, 2)
      GROUP BY p.id_producto, p.nombre
      ORDER BY monto DESC
      LIMIT ?
    `,
      [caja_id, limit]
    );

    return results.map(row => ({
      producto: String(row.producto),
      unidades: Number(row.unidades || 0),
      monto: Number(row.monto || 0)
    }));
  }
}
