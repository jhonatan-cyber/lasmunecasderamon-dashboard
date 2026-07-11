import { query } from '@/lib/database/db';

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
      return { clause: `${column} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`, params: [] };
    case 'last_month':
      return {
        clause:
          `${column} >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') ` +
          `AND ${column} < DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
        params: []
      };
    case 'current_year':
      return { clause: `${column} >= DATE_FORMAT(CURDATE(), '%Y-01-01')`, params: [] };
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

export async function getCommissionsReport(
  period: CommissionPeriod,
  startDate?: string | null,
  endDate?: string | null
) {
  const range = buildDateRange('c.fecha_crea', period, startDate, endDate);

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
