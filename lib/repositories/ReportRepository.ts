import { query } from '@/lib/database/db';

type SalesPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type CommissionPeriod = 'current_month' | 'last_month' | 'current_year' | 'last_year' | 'custom';

type DateRange = {
  clause: string;
  params: string[];
};

export class ReportRepository {
  private static buildDateRange(
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

  static async getSalesReport(
    period: SalesPeriod,
    startDate?: string | null,
    endDate?: string | null
  ) {
    const range = this.buildDateRange('v.fecha_crea', period, startDate, endDate);

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

  static async getCommissionsReport(
    period: CommissionPeriod,
    startDate?: string | null,
    endDate?: string | null
  ) {
    const range = this.buildDateRange('c.fecha_crea', period, startDate, endDate);

    const commissions = await query<any[]>(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
        COUNT(DISTINCT CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN c.venta_id END) AS total_ventas,
        COUNT(DISTINCT CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN c.servicio_id END) AS total_servicios,
        COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
        COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN s.total ELSE 0 END), 0) AS total_servicios_monto,
        COALESCE(SUM(dc.comision), 0) AS total_comisiones,
        COALESCE(AVG(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN dc.comision END), 0) AS promedio_por_venta,
        COALESCE(AVG(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN dc.comision END), 0) AS promedio_por_servicio,
        COUNT(DISTINCT DATE(c.fecha_crea)) AS dias_trabajados,
        COALESCE(SUM(dc.comision) / NULLIF(COUNT(DISTINCT DATE(c.fecha_crea)), 0), 0) AS promedio_diario
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
      INNER JOIN roles r ON r.id_rol = u.rol_id
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
      WHERE c.estado IN (1, 2)
        AND dc.estado IN (1, 2)
        AND LOWER(r.nombre) = 'anfitriona'
        AND ${range.clause}
      GROUP BY u.id_usuario, u.nombre, u.apellido
      ORDER BY total_comisiones DESC, nombre_completo ASC
    `,
      range.params
    );

    const dailyCommissions = await query<any[]>(
      `
      SELECT
        DAYNAME(c.fecha_crea) AS dia_semana,
        CASE DAYOFWEEK(c.fecha_crea)
          WHEN 1 THEN 'Domingo'
          WHEN 2 THEN 'Lunes'
          WHEN 3 THEN 'Martes'
          WHEN 4 THEN 'Miercoles'
          WHEN 5 THEN 'Jueves'
          WHEN 6 THEN 'Viernes'
          WHEN 7 THEN 'Sabado'
        END AS dia_espanol,
        COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN 1 ELSE 0 END), 0) AS total_ventas,
        COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN 1 ELSE 0 END), 0) AS total_servicios,
        COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
        COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN s.total ELSE 0 END), 0) AS total_servicios_monto,
        COALESCE(SUM(dc.comision), 0) AS total_comisiones,
        COALESCE(AVG(dc.comision), 0) AS promedio_comision,
        DAYOFWEEK(c.fecha_crea) AS orden
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
      INNER JOIN roles r ON r.id_rol = u.rol_id
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
      WHERE c.estado IN (1, 2)
        AND dc.estado IN (1, 2)
        AND LOWER(r.nombre) = 'anfitriona'
        AND ${range.clause}
      GROUP BY DAYOFWEEK(c.fecha_crea), DAYNAME(c.fecha_crea)
      ORDER BY orden ASC
    `,
      range.params
    );

    const normalizedCommissions = commissions.map(row => ({
      id_usuario: Number(row.id_usuario),
      nombre: row.nombre,
      apellido: row.apellido,
      nombre_completo: row.nombre_completo,
      total_ventas: Number(row.total_ventas || 0),
      total_servicios: Number(row.total_servicios || 0),
      total_ventas_monto: Number(row.total_ventas_monto || 0),
      total_servicios_monto: Number(row.total_servicios_monto || 0),
      total_comisiones: Number(row.total_comisiones || 0),
      promedio_por_venta: Number(row.promedio_por_venta || 0),
      promedio_por_servicio: Number(row.promedio_por_servicio || 0),
      dias_trabajados: Number(row.dias_trabajados || 0),
      promedio_diario: Number(row.promedio_diario || 0)
    }));

    const statistics = normalizedCommissions.reduce(
      (acc, row) => {
        acc.total_anfitrionas += 1;
        acc.total_ventas_general += row.total_ventas_monto;
        acc.total_servicios_general += row.total_servicios_monto;
        acc.total_comisiones_general += row.total_comisiones;
        acc.total_ventas_count += row.total_ventas;
        acc.total_servicios_count += row.total_servicios;
        return acc;
      },
      {
        total_anfitrionas: 0,
        total_ventas_general: 0,
        total_servicios_general: 0,
        total_comisiones_general: 0,
        promedio_venta_general: 0,
        promedio_servicio_general: 0,
        promedio_comision_por_anfitriona: 0,
        total_ventas_count: 0,
        total_servicios_count: 0
      }
    );

    statistics.promedio_venta_general =
      statistics.total_ventas_count > 0
        ? statistics.total_ventas_general / statistics.total_ventas_count
        : 0;
    statistics.promedio_servicio_general =
      statistics.total_servicios_count > 0
        ? statistics.total_servicios_general / statistics.total_servicios_count
        : 0;
    statistics.promedio_comision_por_anfitriona =
      statistics.total_anfitrionas > 0
        ? statistics.total_comisiones_general / statistics.total_anfitrionas
        : 0;

    return {
      period,
      startDate: startDate || null,
      endDate: endDate || null,
      commissions: normalizedCommissions,
      statistics,
      topPerformers: normalizedCommissions.slice(0, 5).map(row => ({
        id_usuario: row.id_usuario,
        nombre_completo: row.nombre_completo,
        total_comisiones: row.total_comisiones,
        total_ventas: row.total_ventas_monto,
        total_servicios: row.total_servicios_monto,
        total_ventas_count: row.total_ventas,
        total_servicios_count: row.total_servicios,
        promedio_por_venta: row.promedio_por_venta,
        promedio_por_servicio: row.promedio_por_servicio
      })),
      dailyCommissions: dailyCommissions.map(row => ({
        dia_semana: row.dia_semana,
        dia_espanol: row.dia_espanol,
        total_ventas: Number(row.total_ventas || 0),
        total_servicios: Number(row.total_servicios || 0),
        total_ventas_monto: Number(row.total_ventas_monto || 0),
        total_servicios_monto: Number(row.total_servicios_monto || 0),
        total_comisiones: Number(row.total_comisiones || 0),
        promedio_comision: Number(row.promedio_comision || 0)
      }))
    };
  }

  static async getCashRegisterReport(
    period: SalesPeriod,
    startDate?: string | null,
    endDate?: string | null
  ) {
    const range = this.buildDateRange('c.fecha_apertura', period, startDate, endDate);

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
          WHEN HOUR(c.fecha_apertura) BETWEEN 6 AND 17 THEN 'Dia'
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

    const entradas = summary.apertura_total + summary.efectivo + summary.tarjeta + summary.transferencia;
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
}
