import { query } from '@/lib/database/db';

type SalesPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

type DateRange = {
  clause: string;
  params: string[];
};

function buildDateRange(
  column: string,
  period: string,
  startDate?: string | null,
  endDate?: string | null
): DateRange {
  if (period === 'custom' && startDate && endDate) {
    return {
      clause: `${column} >= ? AND ${column} <= ?`,
      params: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
    };
  }

  switch (period) {
    case 'today':
      return { clause: `DATE(${column}) = CURDATE()`, params: [] };
    case 'yesterday':
      return { clause: `DATE(${column}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`, params: [] };
    case 'week':
      return { clause: `DATE(${column}) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`, params: [] };
    case 'month':
    case 'current_month':
      return {
        clause: `${column} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
        params: []
      };
    case 'last_month':
      return {
        clause:
          `${column} >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') ` +
          `AND ${column} < DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
        params: []
      };
    case 'current_year':
      return {
        clause: `${column} >= DATE_FORMAT(CURDATE(), '%Y-01-01')`,
        params: []
      };
    case 'last_year':
      return {
        clause:
          `${column} >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') ` +
          `AND ${column} < DATE_FORMAT(CURDATE(), '%Y-01-01')`,
        params: []
      };
    default:
      return { clause: `DATE(${column}) = CURDATE()`, params: [] };
  }
}

export async function getSalesReport(
  period: SalesPeriod,
  startDate?: string | null,
  endDate?: string | null
) {
  const range = buildDateRange('v.fecha_crea', period, startDate, endDate);

  const [summaryRows, dailyRows] = await Promise.all([
    query<any[]>(
      `
      SELECT
        COALESCE(SUM(v.total), 0) AS totalVentas,
        COUNT(*) AS cantidadVentas,
        COALESCE(AVG(v.total), 0) AS promedioVenta,
        COALESCE(SUM(v.propina), 0) AS totalPropinas,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'efectivo' THEN v.total ELSE 0 END), 0) AS efectivo,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'tarjeta' THEN v.total ELSE 0 END), 0) AS tarjeta,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'transferencia' THEN v.total ELSE 0 END), 0) AS transferencia
      FROM ventas v
      WHERE v.estado IN (1, 2)
        AND ${range.clause}
    `,
      range.params
    ),
    query<any[]>(
      `
      SELECT
        DATE(v.fecha_crea) AS fecha,
        COALESCE(SUM(v.total), 0) AS ventas,
        COUNT(*) AS cantidad,
        COALESCE(SUM(v.propina), 0) AS propinas
      FROM ventas v
      WHERE v.estado IN (1, 2)
        AND ${range.clause}
      GROUP BY DATE(v.fecha_crea)
      ORDER BY DATE(v.fecha_crea) ASC
    `,
      range.params
    )
  ]);

  const summary = summaryRows[0] || {};

  return {
    totalVentas: Number(summary.totalVentas || 0),
    cantidadVentas: Number(summary.cantidadVentas || 0),
    promedioVenta: Number(summary.promedioVenta || 0),
    totalPropinas: Number(summary.totalPropinas || 0),
    ventasPorMetodo: {
      efectivo: Number(summary.efectivo || 0),
      tarjeta: Number(summary.tarjeta || 0),
      transferencia: Number(summary.transferencia || 0)
    },
    ventasPorDia: dailyRows.map(row => ({
      fecha: row.fecha,
      ventas: Number(row.ventas || 0),
      cantidad: Number(row.cantidad || 0),
      propinas: Number(row.propinas || 0)
    }))
  };
}
