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
      return { clause: `DATE(${column}) = CURRENT_DATE`, params: [] };
    case 'yesterday':
      return { clause: `DATE(${column}) = (CAST(CURRENT_DATE AS timestamp) - make_interval(days => CAST(1 AS integer)))`, params: [] };
    case 'week':
      return { clause: `DATE(${column}) >= (CAST(CURRENT_DATE AS timestamp) - make_interval(days => CAST(6 AS integer)))`, params: [] };
    case 'month':
    case 'current_month':
      return {
        clause: `${column} >= date_trunc('month', CURRENT_DATE)`,
        params: []
      };
    case 'last_month':
      return {
        clause:
          `${column} >= date_trunc('month', (CAST(CURRENT_DATE AS timestamp) - make_interval(months => CAST(1 AS integer)))) ` +
          `AND ${column} < date_trunc('month', CURRENT_DATE)`,
        params: []
      };
    case 'current_year':
      return {
        clause: `${column} >= date_trunc('year', CURRENT_DATE)`,
        params: []
      };
    case 'last_year':
      return {
        clause:
          `${column} >= date_trunc('year', (CAST(CURRENT_DATE AS timestamp) - make_interval(years => CAST(1 AS integer)))) ` +
          `AND ${column} < date_trunc('year', CURRENT_DATE)`,
        params: []
      };
    default:
      return { clause: `DATE(${column}) = CURRENT_DATE`, params: [] };
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
        COALESCE(SUM(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS "totalVentas",
        COALESCE(SUM(v.cargo_tarjeta), 0) AS "cargoTarjeta",
        COUNT(*) AS "cantidadVentas",
        COALESCE(AVG(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS "promedioVenta",
        COALESCE(SUM(v.propina), 0) AS "totalPropinas",
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
        COALESCE(SUM(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS ventas,
        COALESCE(SUM(v.cargo_tarjeta), 0) AS "cargoTarjeta",
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
    cargoTarjeta: Number(summary.cargoTarjeta || 0),
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
      cargoTarjeta: Number(row.cargoTarjeta || 0),
      cantidad: Number(row.cantidad || 0),
      propinas: Number(row.propinas || 0)
    }))
  };
}
