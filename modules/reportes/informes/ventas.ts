import {
  listarShotsVentasInforme,
  listarVentasDiariasInforme,
  obtenerResumenVentasInforme
} from './repositorio';

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
      return {
        clause: `DATE(${column}) = (CAST(CURRENT_DATE AS timestamp) - make_interval(days => CAST(1 AS integer)))`,
        params: []
      };
    case 'week':
      return {
        clause: `DATE(${column}) >= (CAST(CURRENT_DATE AS timestamp) - make_interval(days => CAST(6 AS integer)))`,
        params: []
      };
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

  const [summaryRows, dailyRows, shotRows] = await Promise.all([
    obtenerResumenVentasInforme(range),
    listarVentasDiariasInforme(range),
    // Shots separados por a quién se le cobró: el precio de anfitriona es distinto
    // (Bar → Transferencia → "Precio shot anfitriona") y hasta la migración 039 esta
    // elección se descartaba. Los detalles que no son shots no entran al agregado.
    listarShotsVentasInforme(range)
  ]);

  const summary = summaryRows[0] || {};
  const shots = shotRows[0] || {};

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
    shots: {
      cliente: {
        monto: Number(shots.montoCliente || 0),
        cantidad: Number(shots.cantidadCliente || 0)
      },
      anfitriona: {
        monto: Number(shots.montoAnfitriona || 0),
        cantidad: Number(shots.cantidadAnfitriona || 0)
      }
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
