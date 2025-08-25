import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { period = 'current_month', startDate, endDate } = req.query;

    let dateFilter = '';
    let queryParams: any[] = [];

    // Construir filtro de fechas
    if (period === 'custom' && startDate && endDate) {
      dateFilter = 'AND DATE(c.fecha_crea) BETWEEN ? AND ?';
      queryParams = [startDate as string, endDate as string];
    } else if (period === 'current_month') {
      dateFilter =
        'AND YEAR(c.fecha_crea) = YEAR(CURDATE()) AND MONTH(c.fecha_crea) = MONTH(CURDATE())';
    } else if (period === 'last_month') {
      dateFilter =
        'AND YEAR(c.fecha_crea) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(c.fecha_crea) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
    } else if (period === 'current_year') {
      dateFilter = 'AND YEAR(c.fecha_crea) = YEAR(CURDATE())';
    } else if (period === 'last_year') {
      dateFilter = 'AND YEAR(c.fecha_crea) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR))';
    }

    // Consulta principal para comisiones por anfitriona
    const commissionsQuery = `
       SELECT 
         u.id_usuario,
         u.nombre,
         u.apellido,
         CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
         COUNT(DISTINCT CASE WHEN c.venta_id != 0 THEN c.venta_id ELSE NULL END) AS total_ventas,
         COUNT(DISTINCT CASE WHEN c.servicio_id != 0 THEN c.servicio_id ELSE NULL END) AS total_servicios,
         COALESCE(SUM(CASE WHEN c.venta_id != 0 THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
         COALESCE(SUM(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE 0 END), 0) AS total_servicios_monto,
         COALESCE(SUM(dc.comision), 0) AS total_comisiones,
         COALESCE(AVG(CASE WHEN c.venta_id != 0 THEN v.total ELSE NULL END), 0) AS promedio_por_venta,
         COALESCE(AVG(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE NULL END), 0) AS promedio_por_servicio,
         COALESCE(COUNT(DISTINCT DATE(c.fecha_crea)), 0) AS dias_trabajados,
         COALESCE(SUM(dc.comision) / COUNT(DISTINCT DATE(c.fecha_crea)), 0) AS promedio_diario
       FROM usuarios u
       LEFT JOIN detalle_comisiones dc ON u.id_usuario = dc.usuario_id
       LEFT JOIN comisiones c ON dc.comision_id = c.id_comision
       LEFT JOIN ventas v ON c.venta_id = v.id_venta AND v.estado = 1
       LEFT JOIN servicios s ON c.servicio_id = s.id_servicio AND s.estado = 1
       WHERE u.rol_id = (SELECT id_rol FROM roles WHERE nombre = 'Anfitriona')
         AND c.estado = 1
         ${dateFilter}
       GROUP BY u.id_usuario, u.nombre, u.apellido
       ORDER BY total_comisiones DESC
     `;

    // Consulta para estadísticas generales - Simplificada para evitar duplicaciones
    const statsQuery = `
       SELECT 
         (SELECT COUNT(DISTINCT u2.id_usuario) FROM usuarios u2 WHERE u2.rol_id = (SELECT id_rol FROM roles WHERE nombre = 'Anfitriona')) AS total_anfitrionas,
         COALESCE(SUM(CASE WHEN c.venta_id != 0 THEN v.total ELSE 0 END), 0) AS total_ventas_general,
         COALESCE(SUM(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE 0 END), 0) AS total_servicios_general,
         COALESCE(SUM(dc.comision), 0) AS total_comisiones_general,
         COALESCE(AVG(CASE WHEN c.venta_id != 0 THEN v.total ELSE NULL END), 0) AS promedio_venta_general,
         COALESCE(AVG(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE NULL END), 0) AS promedio_servicio_general,
         0 AS promedio_comision_por_anfitriona,
         COALESCE(COUNT(DISTINCT CASE WHEN c.venta_id != 0 THEN c.venta_id ELSE NULL END), 0) AS total_ventas_count,
         COALESCE(COUNT(DISTINCT CASE WHEN c.servicio_id != 0 THEN c.servicio_id ELSE NULL END), 0) AS total_servicios_count
       FROM comisiones c
       INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
       INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
       LEFT JOIN ventas v ON c.venta_id = v.id_venta AND v.estado = 1
       LEFT JOIN servicios s ON c.servicio_id = s.id_servicio AND s.estado = 1
       WHERE u.rol_id = (SELECT id_rol FROM roles WHERE nombre = 'Anfitriona')
         AND c.estado = 1
         ${dateFilter}
     `;

    // Consulta para top performers
    const topPerformersQuery = `
       SELECT 
         u.id_usuario,
         CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
         COALESCE(SUM(dc.comision), 0) AS total_comisiones,
         COALESCE(SUM(CASE WHEN c.venta_id != 0 THEN v.total ELSE 0 END), 0) AS total_ventas,
         COALESCE(SUM(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE 0 END), 0) AS total_servicios,
         COUNT(DISTINCT CASE WHEN c.venta_id != 0 THEN c.venta_id ELSE NULL END) AS total_ventas_count,
         COUNT(DISTINCT CASE WHEN c.servicio_id != 0 THEN c.servicio_id ELSE NULL END) AS total_servicios_count,
         COALESCE(AVG(CASE WHEN c.venta_id != 0 THEN v.total ELSE NULL END), 0) AS promedio_por_venta,
         COALESCE(AVG(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE NULL END), 0) AS promedio_por_servicio
       FROM usuarios u
       LEFT JOIN detalle_comisiones dc ON u.id_usuario = dc.usuario_id
       LEFT JOIN comisiones c ON dc.comision_id = c.id_comision
       LEFT JOIN ventas v ON c.venta_id = v.id_venta AND v.estado = 1
       LEFT JOIN servicios s ON c.servicio_id = s.id_servicio AND s.estado = 1
       WHERE u.rol_id = (SELECT id_rol FROM roles WHERE nombre = 'Anfitriona')
         AND c.estado = 1
         ${dateFilter}
       GROUP BY u.id_usuario, u.nombre, u.apellido
       ORDER BY total_comisiones DESC
       LIMIT 5
     `;

    // Consulta para comisiones por día de la semana
    const dailyCommissionsQuery = `
       SELECT 
         DAYNAME(c.fecha_crea) AS dia_semana,
         CASE DAYNAME(c.fecha_crea)
           WHEN 'Monday' THEN 'Lunes'
           WHEN 'Tuesday' THEN 'Martes'
           WHEN 'Wednesday' THEN 'Miércoles'
           WHEN 'Thursday' THEN 'Jueves'
           WHEN 'Friday' THEN 'Viernes'
           WHEN 'Saturday' THEN 'Sábado'
           WHEN 'Sunday' THEN 'Domingo'
         END AS dia_espanol,
         COUNT(DISTINCT CASE WHEN c.venta_id != 0 THEN c.venta_id ELSE NULL END) AS total_ventas,
         COUNT(DISTINCT CASE WHEN c.servicio_id != 0 THEN c.servicio_id ELSE NULL END) AS total_servicios,
         COALESCE(SUM(CASE WHEN c.venta_id != 0 THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
         COALESCE(SUM(CASE WHEN c.servicio_id != 0 THEN s.precio_servicio ELSE 0 END), 0) AS total_servicios_monto,
         COALESCE(SUM(dc.comision), 0) AS total_comisiones,
         COALESCE(AVG(dc.comision), 0) AS promedio_comision
       FROM comisiones c
       INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
       INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
       LEFT JOIN ventas v ON c.venta_id = v.id_venta AND v.estado = 1
       LEFT JOIN servicios s ON c.servicio_id = s.id_servicio AND s.estado = 1
       WHERE c.estado = 1 
         AND u.rol_id = (SELECT id_rol FROM roles WHERE nombre = 'Anfitriona')
         ${dateFilter}
       GROUP BY DAYNAME(c.fecha_crea)
       ORDER BY FIELD(DAYNAME(c.fecha_crea), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
     `;

    // Ejecutar todas las consultas
    const [commissionsData, statsData, topPerformersData, dailyCommissionsData] =
      (await Promise.all([
        query(commissionsQuery, queryParams),
        query(statsQuery, queryParams),
        query(topPerformersQuery, queryParams),
        query(dailyCommissionsQuery, queryParams)
      ])) as any[];

    // Calcular promedio por anfitriona de manera separada
    const totalComisiones = (statsData as any[])?.[0]?.total_comisiones_general || 0;
    const totalAnfitrionas = (statsData as any[])?.[0]?.total_anfitrionas || 1;
    const promedioPorAnfitriona = totalAnfitrionas > 0 ? totalComisiones / totalAnfitrionas : 0;

    const result = {
      period: period,
      startDate: startDate || null,
      endDate: endDate || null,
      commissions: (commissionsData as any[]) || [],
      statistics: {
        ...(statsData as any[])?.[0],
        promedio_comision_por_anfitriona: promedioPorAnfitriona
      },
      topPerformers: topPerformersData || [],
      dailyCommissions: dailyCommissionsData || []
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
