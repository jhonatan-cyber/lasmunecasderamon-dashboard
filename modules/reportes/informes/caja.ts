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
      return { clause: `${column} >= date_trunc('month', CURRENT_DATE)`, params: [] };
    case 'last_month':
      return {
        clause:
          `${column} >= date_trunc('month', (CAST(CURRENT_DATE AS timestamp) - make_interval(months => CAST(1 AS integer)))) ` +
          `AND ${column} < date_trunc('month', CURRENT_DATE)`,
        params: []
      };
    default:
      return { clause: `DATE(${column}) = CURRENT_DATE`, params: [] };
  }
}

export async function getCashRegisterReport(
  period: SalesPeriod,
  startDate?: string | null,
  endDate?: string | null
) {
  const range = buildDateRange('c.fecha_apertura', period, startDate, endDate);

  const cajas = await query<any[]>(
    `
    SELECT
      c.id_caja,
      c.fecha_apertura,
      c.fecha_cierre,
      c.monto_apertura,
      c.monto_cierre,
      c.estado,
      c.venta,
      c.servicio,
      c.efectivo,
      c.tarjeta,
      c.transferencia,
      c.propina,
      c.comision,
      c.iva,
      c.devolucion AS devoluciones,
      CASE
        WHEN EXTRACT(HOUR FROM c.fecha_apertura) BETWEEN 6 AND 17 THEN 'Dia'
        ELSE 'Noche'
      END AS turno,
      COALESCE(
        c.monto_cierre - (
          COALESCE(c.monto_apertura, 0) +
          COALESCE(c.efectivo, 0) +
          COALESCE(c.tarjeta, 0) +
          COALESCE(c.transferencia, 0) -
          COALESCE(c.devolucion, 0)
        ),
        0
      ) AS diferencia
    FROM cajas c
    WHERE c.estado IN (0, 1)
      AND ${range.clause}
    ORDER BY c.fecha_apertura DESC
  `,
    range.params
  );

  const summary = cajas.reduce(
    (acc, caja) => {
      acc.cajas += 1;
      acc.apertura_total += Number(caja.monto_apertura || 0);
      acc.cierre_total += Number(caja.monto_cierre || 0);
      acc.diferencia_total += Number(caja.diferencia || 0);
      acc.ventas += Number(caja.venta || 0);
      acc.servicios += Number(caja.servicio || 0);
      acc.efectivo += Number(caja.efectivo || 0);
      acc.tarjeta += Number(caja.tarjeta || 0);
      acc.transferencia += Number(caja.transferencia || 0);
      acc.propina += Number(caja.propina || 0);
      acc.comision += Number(caja.comision || 0);
      acc.iva += Number(caja.iva || 0);
      acc.devoluciones += Number(caja.devoluciones || 0);
      return acc;
    },
    {
      cajas: 0,
      apertura_total: 0,
      cierre_total: 0,
      diferencia_total: 0,
      ventas: 0,
      servicios: 0,
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      propina: 0,
      comision: 0,
      iva: 0,
      devoluciones: 0
    }
  );

  const ingresosDetalle = [
    { tipo: 'ventas', monto: summary.ventas },
    { tipo: 'servicios', monto: summary.servicios },
    { tipo: 'propinas', monto: summary.propina }
  ].filter(item => item.monto > 0);

  const egresosDetalle = [
    { tipo: 'comisiones', monto: summary.comision },
    { tipo: 'devoluciones', monto: summary.devoluciones },
    { tipo: 'iva', monto: summary.iva }
  ].filter(item => item.monto > 0);

  const entradas =
    summary.apertura_total + summary.efectivo + summary.tarjeta + summary.transferencia;
  const salidas = summary.devoluciones + summary.comision + summary.iva;

  return {
    period,
    range: { start: startDate || null, end: endDate || null },
    summary,
    cajas: cajas.map(caja => ({
      id_caja: Number(caja.id_caja),
      fecha_apertura: caja.fecha_apertura,
      fecha_cierre: caja.fecha_cierre,
      monto_apertura: Number(caja.monto_apertura || 0),
      monto_cierre: Number(caja.monto_cierre || 0),
      estado: Number(caja.estado || 0),
      venta: Number(caja.venta || 0),
      servicio: Number(caja.servicio || 0),
      efectivo: Number(caja.efectivo || 0),
      tarjeta: Number(caja.tarjeta || 0),
      transferencia: Number(caja.transferencia || 0),
      propina: Number(caja.propina || 0),
      comision: Number(caja.comision || 0),
      devoluciones: Number(caja.devoluciones || 0),
      turno: caja.turno,
      diferencia: Number(caja.diferencia || 0)
    })),
    movimientos: {
      ingresos: {
        total: ingresosDetalle.reduce((sum, item) => sum + item.monto, 0),
        detalle: ingresosDetalle
      },
      egresos: {
        total: egresosDetalle.reduce((sum, item) => sum + item.monto, 0),
        detalle: egresosDetalle
      }
    },
    flujoEfectivo: {
      entradas,
      salidas,
      neto: entradas - salidas
    }
  };
}
