/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * Endpoint para verificar si alguna anfitriona de un pedido está en una venta activa con habitación
 * Recibe un array de IDs de anfitrionas y devuelve la habitación si alguna está en venta activa
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { anfitrionasIds } = req.body;

    if (!anfitrionasIds || !Array.isArray(anfitrionasIds) || anfitrionasIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un array de IDs de anfitrionas' 
      });
    }

    console.log('[CHECK ACTIVE ROOM] Buscando venta activa para anfitrionas:', anfitrionasIds);

    // Buscar si alguna de las anfitrionas está en una venta activa con habitación
    const resultado = await query(`
      SELECT 
        v.id_venta,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        v.tiempo,
        v.codigo,
        vu.usuario_id as anfitriona_id
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id IN (${anfitrionasIds.map(() => '?').join(',')})
        AND v.habitacion_id IS NOT NULL
        AND v.tiempo > 0
        AND v.estado = 1
      ORDER BY v.fecha_crea DESC
      LIMIT 1
    `, anfitrionasIds) as any[];

    if (resultado && resultado.length > 0) {
      const ventaActiva = resultado[0];
      console.log('[CHECK ACTIVE ROOM] ✅ Encontrada venta activa:', ventaActiva);
      
      return res.status(200).json({
        success: true,
        hasActiveRoom: true,
        data: {
          ventaId: ventaActiva.id_venta,
          habitacionId: ventaActiva.habitacion_id,
          habitacionNombre: ventaActiva.habitacion_nombre,
          tiempo: ventaActiva.tiempo,
          codigoVenta: ventaActiva.codigo,
          anfitrionaId: ventaActiva.anfitriona_id
        }
      });
    }

    console.log('[CHECK ACTIVE ROOM] ℹ️ No se encontró venta activa con habitación');
    return res.status(200).json({
      success: true,
      hasActiveRoom: false,
      data: null
    });

  } catch (error) {
    console.error('[CHECK ACTIVE ROOM] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar habitación activa',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

