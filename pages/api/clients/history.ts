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
    // 1. Servicios del cliente
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
        creator.nick as atendido_por_nick,
        creator.nombre as atendido_por_nombre,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres
      FROM servicios s
      LEFT JOIN detalle_servicios_clientes dsc ON dsc.servicio_id = s.id_servicio
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      LEFT JOIN usuarios creator ON s.created_by = creator.id_usuario
      WHERE (s.cliente_id = ? OR dsc.cliente_id = ?)
        AND s.estado IN (1, 2, 3)
      GROUP BY s.id_servicio
      ORDER BY s.fecha_crea DESC
    `, [cliente_id, cliente_id])) as any[];

    // 2. Ventas del cliente
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
        creator.nick as atendido_por_nick,
        creator.nombre as atendido_por_nombre,
        mesero.nick as mesero_nick,
        mesero.nombre as mesero_nombre,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' x', dv.cantidad) SEPARATOR '||') as productos_raw,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      LEFT JOIN ventas_usuarios vu ON vu.venta_id = v.id_venta
      LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
      LEFT JOIN usuarios creator ON v.created_by = creator.id_usuario
      LEFT JOIN pedidos ped ON v.pedido_id = ped.id_pedido
      LEFT JOIN usuarios mesero ON ped.mesero_id = mesero.id_usuario
      WHERE v.cliente_id = ?
        AND v.estado IN (1, 2)
      GROUP BY v.id_venta
      ORDER BY v.fecha_crea DESC
    `, [cliente_id])) as any[];

    // 3. Movimientos prepago (cargas de saldo)
    const prepagoMoves = (await query(`
      SELECT 
        m.id_movimiento as id,
        m.tipo as category,
        m.monto,
        NULL as tiempo,
        m.metodo_pago,
        m.fecha_crea,
        NULL as estado,
        NULL as habitacion_nombre,
        u.nick as atendido_por_nick,
        u.nombre as atendido_por_nombre,
        NULL as mesero_nick,
        NULL as mesero_nombre,
        NULL as productos_raw,
        NULL as anfitrionas_nombres,
        m.metadatos
      FROM clientes_prepago_movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id_usuario
      WHERE m.cliente_id = ?
      ORDER BY m.fecha_crea DESC
    `, [cliente_id])) as any[];

    // Format servicios
    const formattedServicios = servicios.map((s: any) => ({
      id: s.id,
      category: 'SERVICIO',
      monto: Number(s.monto || 0),
      metodo_pago: s.metodo_pago,
      fecha_crea: s.fecha_crea,
      estado: s.estado,
      atendido_por: s.atendido_por_nick || s.atendido_por_nombre || 'Sistema',
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
        atendido_por: v.atendido_por_nick || v.atendido_por_nombre || 'Sistema',
        mesero: v.mesero_nick || v.mesero_nombre || null,
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

    // Format prepago movements (CARGA, etc)
    const formattedPrepago = prepagoMoves.map((m: any) => {
      let extraDetalle = null;
      if (m.metadatos) {
        try {
          extraDetalle = typeof m.metadatos === 'string' ? JSON.parse(m.metadatos) : m.metadatos;
        } catch (e) {
          // ignore parsing errors
        }
      }

      return {
        id: m.id,
        category: m.category, // CARGA o CONSUMO
        monto: Number(m.monto || 0),
        metodo_pago: m.metodo_pago || 'efectivo',
        fecha_crea: m.fecha_crea,
        estado: null,
        atendido_por: m.atendido_por_nick || m.atendido_por_nombre || 'Sistema',
        detalle: extraDetalle,
      };
    });

    // Combine and sort by date descending
    // Filter out CONSUMO movements from prepago table that are already linked to a sale (to avoid duplicates)
    // We keep CARGA and any movement that doesn't have a linked sale/service if any.
    const allItems = [
      ...formattedServicios, 
      ...formattedVentas, 
      ...formattedPrepago.filter((p: any) => p.category === 'CARGA')
    ].sort((a, b) => new Date(b.fecha_crea).getTime() - new Date(a.fecha_crea).getTime());

    return res.status(200).json({
      success: true,
      data: allItems,
    });
  } catch (error: any) {
    console.error('[API /clients/history] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial del cliente',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
