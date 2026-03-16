import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { caja_id } = req.query;

    if (!caja_id) {
      return res.status(400).json({ error: 'caja_id es requerido' });
    }


    const habitacionesStats = await query(`
      SELECT 
        h.id_habitacion as habitacion_id,
        h.nombre as habitacion_nombre,
        COUNT(s.id_servicio) as total_servicios,
        
        -- Monto total de servicios (precio del servicio)
        COALESCE(SUM(s.precio_servicio), 0) as monto_servicios,
        
        -- Monto total de habitación (precio de la habitación)
        COALESCE(SUM(s.precio_habitacion), 0) as monto_habitacion,
        
        -- Monto total de IVA
        COALESCE(SUM(s.iva), 0) as monto_iva,
        
        -- Comisiones de habitación (comision_anfitriona * número de servicios)
        COALESCE(SUM(h.comision_anfitriona), 0) as comisiones_habitacion,
        
        -- Total generado por esta habitación
        COALESCE(SUM(s.precio_servicio + s.precio_habitacion + s.iva), 0) as total_generado
        
      FROM habitaciones h
      LEFT JOIN servicios s ON h.id_habitacion = s.habitacion_id 
        AND s.caja_id = ?
      GROUP BY h.id_habitacion, h.nombre, h.comision_anfitriona
      HAVING total_servicios > 0
      ORDER BY total_generado DESC, h.nombre ASC
    `, [caja_id]);

    // Obtener comisiones de ventas por separado (más simple)
    const comisionesVentas = await query(`
      SELECT 
        COALESCE(SUM(dv.comision), 0) as total_comisiones_venta
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      WHERE v.caja_id = ?
    `, [caja_id]);

    const totalComisionesVenta = (comisionesVentas as any)[0]?.total_comisiones_venta || 0;

    // Distribuir las comisiones de venta proporcionalmente entre las habitaciones
    const totalServicios = habitacionesStats.reduce((sum: number, h: any) => sum + h.total_servicios, 0);
    
    const habitacionesConComisiones = habitacionesStats.map((habitacion: any) => ({
      ...habitacion,
      comisiones_venta: totalServicios > 0 
        ? Math.round((habitacion.total_servicios / totalServicios) * totalComisionesVenta)
        : 0
    }));


    return res.status(200).json({
      success: true,
      data: habitacionesConComisiones
    });

  } catch (error) {
   
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: (error as Error).message
    });
  }
}