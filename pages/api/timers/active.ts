import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * GET /api/timers/active
 * Obtiene todos los servicios y ventas activos con habitación y tiempo, con información de temporizadores
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    // Obtener servicios activos
    const activeServices = await query(
      `SELECT 
        s.id_servicio,
        s.codigo,
        s.habitacion_id,
        h.nombre as habitacion_nombre,
        s.tiempo,
        s.fecha_crea,
        s.cliente_id,
        c.nombre as cliente_nombre,
        GROUP_CONCAT(DISTINCT CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') as anfitrionas
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id AND u.rol_id = 3
      WHERE s.estado = 1
      GROUP BY s.id_servicio, s.codigo, s.habitacion_id, h.nombre, s.tiempo, s.fecha_crea, s.cliente_id, c.nombre
      ORDER BY s.fecha_crea DESC`,
      []
    );

    // Obtener ventas activas con habitación y tiempo > 0
    const activeVentas = await query(
      `SELECT 
        v.id_venta,
        v.codigo,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        v.tiempo,
        v.fecha_crea,
        v.cliente_id,
        c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      WHERE v.habitacion_id IS NOT NULL 
        AND v.tiempo > 0 
        AND v.estado = 1
      ORDER BY v.fecha_crea DESC`,
      []
    );

    const timersData = [
      ...(Array.isArray(activeServices)
        ? activeServices.map((service: any) => ({
            servicioId: service.id_servicio,
            codigo: service.codigo,
            roomId: service.habitacion_id,
            roomName: service.habitacion_nombre || `Habitación ${service.habitacion_id}`,
            duration: service.tiempo,
            startTime: service.fecha_crea,
            clienteNombre: service.cliente_nombre || 'Cliente',
            anfitrionas: service.anfitrionas || '',
            tipoTransaccion: 'servicio' as const
          }))
        : []),
      ...(Array.isArray(activeVentas)
        ? activeVentas.map((venta: any) => ({
            servicioId: venta.id_venta,
            codigo: venta.codigo,
            roomId: venta.habitacion_id,
            roomName: venta.habitacion_nombre || `Habitación ${venta.habitacion_id}`,
            duration: venta.tiempo,
            startTime: venta.fecha_crea,
            clienteNombre: venta.cliente_nombre || 'Cliente',
            anfitrionas: '',
            tipoTransaccion: 'venta' as const
          }))
        : [])
    ];

    return res.status(200).json({
      success: true,
      data: timersData
    });
  } catch (error) {
    console.error('[API /timers/active] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener timers activos',
      error: String(error)
    });
  }
}
