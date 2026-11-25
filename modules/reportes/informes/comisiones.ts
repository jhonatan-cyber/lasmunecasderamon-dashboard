import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import { listarComisionesDiariasInforme, listarComisionesInforme } from './repositorio';

type CommissionPeriod = 'current_month' | 'last_month' | 'current_year' | 'last_year' | 'custom';

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
    case 'current_month':
      return { clause: `${column} >= date_trunc('month', CURRENT_DATE)`, params: [] };
    case 'last_month':
      return {
        clause:
          `${column} >= date_trunc('month', (CAST(CURRENT_DATE AS timestamp) - make_interval(months => CAST(1 AS integer)))) ` +
          `AND ${column} < date_trunc('month', CURRENT_DATE)`,
        params: []
      };
    case 'current_year':
      return { clause: `${column} >= date_trunc('year', CURRENT_DATE)`, params: [] };
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

export async function getCommissionsReport(
  period: CommissionPeriod,
  startDate?: string | null,
  endDate?: string | null
) {
  try {
    const range = buildDateRange('c.fecha_crea', period, startDate, endDate);

    const commissions = await listarComisionesInforme(range);
    const dailyCommissions = await listarComisionesDiariasInforme(range);

    const normalizedCommissions = commissions.map(row => ({
      id_usuario: String(row.id_usuario),
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
  } catch (err) {
    logger.error('[CommissionReport] Error en getCommissionsReport:', {
      period,
      startDate,
      endDate,
      err
    });
    throw new DatabaseError('Error al obtener reporte de comisiones', err);
  }
}
