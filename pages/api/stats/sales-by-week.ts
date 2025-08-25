import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { offset = 0 } = req.query;
    const offsetWeeks = parseInt(offset as string) || 0;

    // Calcular fechas usando la misma lógica que PHP
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Lunes de esta semana
    
    const mondayTarget = new Date(mondayThisWeek);
    mondayTarget.setDate(mondayThisWeek.getDate() - (offsetWeeks * 7)); // Retroceder semanas
    
    const sundayTarget = new Date(mondayTarget);
    sundayTarget.setDate(mondayTarget.getDate() + 6); // Domingo de la semana objetivo

    const startDate = mondayTarget.toISOString().split('T')[0];
    const endDate = sundayTarget.toISOString().split('T')[0];

         const salesData = await query(`
       SELECT
         dias.dia_semana,
         COALESCE(SUM(CAST(v.total AS DECIMAL(10,2))), 0) AS total
       FROM (
         SELECT 'Monday' AS dia_semana UNION ALL
         SELECT 'Tuesday' UNION ALL
         SELECT 'Wednesday' UNION ALL
         SELECT 'Thursday' UNION ALL
         SELECT 'Friday' UNION ALL
         SELECT 'Saturday' UNION ALL
         SELECT 'Sunday'
       ) AS dias
       LEFT JOIN ventas v
         ON DAYNAME(v.fecha_crea) = dias.dia_semana
         AND DATE(v.fecha_crea) BETWEEN ? AND ? 
         AND v.estado = 1
       GROUP BY dias.dia_semana
       ORDER BY FIELD(
         dias.dia_semana,
         'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
       )
     `, [startDate, endDate]);

     // Mapear nombres en español y agregar orden
    const diasEspanol: { [key: string]: string } = {
      'Monday': 'Lunes',
      'Tuesday': 'Martes', 
      'Wednesday': 'Miércoles',
      'Thursday': 'Jueves',
      'Friday': 'Viernes',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };

    const processedData = (salesData as any[]).map((day, index) => ({
      dia_semana: day.dia_semana,
      dia_espanol: diasEspanol[day.dia_semana],
      orden: index + 1,
      total: Number(day.total) || 0
    }));

    // Calcular totales
    const totalVentas = processedData.reduce((sum: number, day: any) => {
      return sum + day.total;
    }, 0);
    
    const promedioDiario = totalVentas / 7;
    const diaMaxVentas = processedData.reduce((max: any, day: any) => 
      day.total > max.total ? day : max, processedData[0]);
    const diaMinVentas = processedData.reduce((min: any, day: any) => 
      day.total < min.total ? day : min, processedData[0]);

    const result = {
      startDate,
      endDate,
      data: processedData,
      summary: {
        totalVentas,
        promedioDiario,
        diaMaxVentas: diaMaxVentas?.dia_espanol || 'N/A',
        diaMinVentas: diaMinVentas?.dia_espanol || 'N/A'
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
