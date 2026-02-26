import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { period, startDate, endDate } = req.query;

    let dateFilter = '';
    let params: any[] = [];

    // Si vienen fechas explícitas, usar siempre rango (robusto ante clientes que no envían period correctamente)
    const start = (startDate as string) || '';
    const end = (endDate as string) || '';
    if (start && end) {
      dateFilter = 'DATE(v.fecha_crea) BETWEEN ? AND ?';
      params = [start, end];
    } else {
      // Determinar el filtro de fecha según el período
      switch (period) {
        case 'today':
          dateFilter = 'DATE(v.fecha_crea) = CURDATE()';
          break;
        case 'yesterday':
          dateFilter = 'DATE(v.fecha_crea) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
          break;
        case 'week':
          dateFilter = 'v.fecha_crea >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
          break;
        case 'month':
          dateFilter =
            'YEAR(v.fecha_crea) = YEAR(CURDATE()) AND MONTH(v.fecha_crea) = MONTH(CURDATE())';
          break;
        case 'custom':
          // Si falta alguna fecha, caer a hoy
          dateFilter = 'DATE(v.fecha_crea) = CURDATE()';
          break;
        default:
          dateFilter = 'DATE(v.fecha_crea) = CURDATE()';
      }
    }

    // 1. Estadísticas principales
    const statsQuery = `
      SELECT 
        COALESCE(SUM(v.total), 0) as totalVentas,
        COUNT(v.id_venta) as cantidadVentas,
        COALESCE(AVG(v.total), 0) as promedioVenta,
        COALESCE(SUM(v.propina), 0) as totalPropinas
      FROM ventas v
      WHERE v.estado = 1 AND ${dateFilter}
    `;

    const stats = (await query(statsQuery, params)) as any[];

    // 2. Ventas por método de pago
    const paymentMethodsQuery = `
      SELECT 
        v.metodo_pago,
        COALESCE(SUM(v.total), 0) as total
      FROM ventas v
      WHERE v.estado = 1 AND ${dateFilter}
      GROUP BY v.metodo_pago
    `;

    const paymentMethods = (await query(paymentMethodsQuery, params)) as any[];

    // 3. Ventas por día (para el período seleccionado)
    const dailySalesQuery = `
      SELECT 
        DATE(v.fecha_crea) as fecha,
        COALESCE(SUM(v.total), 0) as ventas,
        COUNT(v.id_venta) as cantidad,
        COALESCE(SUM(v.propina), 0) as propinas
      FROM ventas v
      WHERE v.estado = 1 AND ${dateFilter}
      GROUP BY DATE(v.fecha_crea)
      ORDER BY fecha DESC
    `;

    const dailySales = (await query(dailySalesQuery, params)) as any[];

    // Procesar datos de métodos de pago
    const ventasPorMetodo = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0
    };

    paymentMethods.forEach(method => {
      if (method.metodo_pago === 'efectivo') {
        ventasPorMetodo.efectivo = parseFloat(method.total) || 0;
      } else if (method.metodo_pago === 'tarjeta') {
        ventasPorMetodo.tarjeta = parseFloat(method.total) || 0;
      } else if (method.metodo_pago === 'transferencia') {
        ventasPorMetodo.transferencia = parseFloat(method.total) || 0;
      }
    });

    // Procesar ventas por día
    const ventasPorDia = dailySales.map(dia => ({
      fecha: dia.fecha,
      ventas: parseFloat(dia.ventas),
      cantidad: parseInt(dia.cantidad),
      propinas: parseFloat(dia.propinas)
    }));

    const result = {
      totalVentas: parseFloat(stats[0]?.totalVentas || 0),
      cantidadVentas: parseInt(stats[0]?.cantidadVentas || 0),
      promedioVenta: parseFloat(stats[0]?.promedioVenta || 0),
      totalPropinas: parseFloat(stats[0]?.totalPropinas || 0),
      ventasPorMetodo,
      ventasPorDia
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
