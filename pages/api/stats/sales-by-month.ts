import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { offset = 0 } = req.query;
    const offsetYears = parseInt(offset as string) || 0;

    // Calcular año usando la misma lógica que PHP
    const currentYear = new Date().getFullYear();
    const selectedYear = currentYear - offsetYears;
    const salesData = await query(
      `
      SELECT 
        meses.nombre AS mes,
        meses.mes_num,
        COALESCE(SUM(CAST(v.total AS DECIMAL(10,2))), 0) AS total,
        COALESCE(COUNT(v.id_venta), 0) AS cantidad_ventas
      FROM (
        SELECT 1 AS mes_num, 'Enero' AS nombre UNION ALL
        SELECT 2, 'Febrero' UNION ALL
        SELECT 3, 'Marzo' UNION ALL
        SELECT 4, 'Abril' UNION ALL
        SELECT 5, 'Mayo' UNION ALL
        SELECT 6, 'Junio' UNION ALL
        SELECT 7, 'Julio' UNION ALL
        SELECT 8, 'Agosto' UNION ALL
        SELECT 9, 'Septiembre' UNION ALL
        SELECT 10, 'Octubre' UNION ALL
        SELECT 11, 'Noviembre' UNION ALL
        SELECT 12, 'Diciembre'
      ) AS meses
      LEFT JOIN ventas v ON MONTH(v.fecha_crea) = meses.mes_num 
        AND YEAR(v.fecha_crea) = ? 
        AND v.estado = 1
      GROUP BY meses.mes_num, meses.nombre
      ORDER BY meses.mes_num
    `,
      [selectedYear]
    );

    const totalVentas = (salesData as any[]).reduce((sum: number, month: any) => {
      return sum + (Number(month.total) || 0);
    }, 0);

    const totalCantidad = (salesData as any[]).reduce(
      (sum: number, month: any) => sum + (Number(month.cantidad_ventas) || 0),
      0
    );

    // Obtener el mes con más ventas
    const mesMaxVentas = (salesData as any[]).reduce(
      (max: any, month: any) => (month.total > max.total ? month : max),
      (salesData as any[])[0]
    );

    // Obtener el mes con menos ventas
    const mesMinVentas = (salesData as any[]).reduce(
      (min: any, month: any) => (month.total < min.total ? month : min),
      (salesData as any[])[0]
    );

    const result = {
      year: selectedYear,
      data: salesData,
      summary: {
        totalVentas,
        totalCantidad,
        mesMaxVentas: mesMaxVentas?.mes || 'N/A',
        mesMinVentas: mesMinVentas?.mes || 'N/A',
        promedioMensual: totalVentas / 12
      }
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
