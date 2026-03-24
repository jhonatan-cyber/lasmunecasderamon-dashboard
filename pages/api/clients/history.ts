/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * GET /api/clients/history?cliente_id=XXX
 * 
 * Returns a unified history of all client activity:
 * - Services (with room, duration, hostesses)
 * - Sales/Consumption (with products, hostesses)
 * - Prepago balance loads
 * 
 * All items sorted by date descending.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { cliente_id } = req.query;
  if (!cliente_id) {
    return res.status(400).json({ success: false, message: 'cliente_id es requerido' });
  }

  try {
    // 1. Servicios del cliente (tabla servicios + detalle_servicios_clientes)
    const servicios = (await query(`
      SELECT 
        s.id_servicio as id,
        'SERVICIO' as category,
        s.total as monto,
        s.tiempo,
        s.metodo_pago,
        s.fecha_crea,
        s.estado,
        h.nombre as habitacion_nombre,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres
      FROM servicios s
      LEFT JOIN detalle_servicios_clientes dsc ON dsc.servicio_id = s.id_servicio
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE (s.cliente_id = ? OR dsc.cliente_id = ?)
        AND s.estado IN (1, 2, 3)
      GROUP BY s.id_servicio
      ORDER BY s.fecha_crea DESC
    `, [cliente_id, cliente_id])) as any[];

    // 2. Ventas del cliente (tabla ventas + detalle_ventas + productos)
    const ventas = (await query(`
      SELECT 
        v.id_venta as id,
        'CONSUMO' as category,
        v.total as monto,
        v.tiempo,
        v.metodo_pago,
        v.fecha_crea,
        v.estado,
        h.nombre as habitacion_nombre,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' x', dv.cantidad) SEPARATOR '||') as productos_raw,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
      LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
      WHERE v.cliente_id = ?
        AND v.estado IN (1, 2)
      GROUP BY v.id_venta
      ORDER BY v.fecha_crea DESC
    `, [cliente_id])) as any[];

    // 3. Movimientos prepago (cargas de saldo)
    const prepagoLoads = (await query(`
      SELECT 
        id_movimiento as id,
        'CARGA' as category,
        monto,
        NULL as tiempo,
        metodo_pago,
        fecha_crea,
        NULL as estado,
        NULL as habitacion_nombre,
        NULL as anfitrionas_nombres
      FROM clientes_prepago_movimientos
      WHERE cliente_id = ? AND tipo = 'CARGA'
      ORDER BY fecha_crea DESC
    `, [cliente_id])) as any[];

    // Format servicios
    const formattedServicios = servicios.map((s: any) => ({
      id: s.id,
      category: 'SERVICIO',
      monto: Number(s.monto || 0),
      metodo_pago: s.metodo_pago,
      fecha_crea: s.fecha_crea,
      estado: s.estado,
      detalle: {
        habitacion: s.habitacion_nombre || null,
        tiempo: s.tiempo || null,
        anfitrionas: s.anfitrionas_nombres
          ? s.anfitrionas_nombres.split(', ').filter(Boolean)
          : [],
      },
    }));

    // Format ventas
    const formattedVentas = ventas.map((v: any) => {
      const productos = v.productos_raw
        ? v.productos_raw.split('||').map((item: string) => {
            const parts = item.trim().split(' x');
            return {
              nombre: parts[0] || 'Producto',
              cantidad: parseInt(parts[1]) || 1,
            };
          })
        : [];

      return {
        id: v.id,
        category: 'CONSUMO',
        monto: Number(v.monto || 0),
        metodo_pago: v.metodo_pago,
        fecha_crea: v.fecha_crea,
        estado: v.estado,
        detalle: {
          productos,
          habitacion: v.habitacion_nombre || null,
          tiempo: v.tiempo || null,
          anfitrionas: v.anfitrionas_nombres
            ? v.anfitrionas_nombres.split(', ').filter(Boolean)
            : [],
        },
      };
    });

    // Format cargas
    const formattedCargas = prepagoLoads.map((c: any) => ({
      id: c.id,
      category: 'CARGA',
      monto: Number(c.monto || 0),
      metodo_pago: c.metodo_pago || 'efectivo',
      fecha_crea: c.fecha_crea,
      estado: null,
      detalle: null,
    }));

    // Combine and sort by date descending
    const allItems = [...formattedServicios, ...formattedVentas, ...formattedCargas]
      .sort((a, b) => new Date(b.fecha_crea).getTime() - new Date(a.fecha_crea).getTime());

    return res.status(200).json({
      success: true,
      data: allItems,
    });
  } catch (error) {
    console.error('[API /clients/history] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial del cliente',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
