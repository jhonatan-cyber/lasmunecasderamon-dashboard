/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  const { id, type } = req.query;

  try {
    if (type === 'asistencia') {
      const rows = await query(`
        SELECT
          a.id_asistencia, a.fecha, a.hora, a.estado,
          u.sueldo, u.aporte, u.descuento,
          (
            SELECT COUNT(DISTINCT YEARWEEK(a2.fecha, 1))
            FROM asistencias a2
            WHERE a2.usuario_id = a.usuario_id AND a2.estado = 1
              AND DAYOFWEEK(a2.fecha) IN (3,4,5,6,7,1)
          ) AS semanas_con_descuento
        FROM asistencias a
        INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
        WHERE a.id_asistencia = ?
      `, [id]) as any[];

      if (!rows.length) return res.status(200).json({ success: true, data: null });
      const r = rows[0];
      return res.status(200).json({
        success: true,
        data: {
          ...r,
          tipo: 'asistencia',
          descuento_total: Number(r.semanas_con_descuento) * Number(r.descuento),
          neto: Number(r.sueldo) - Number(r.aporte) - (Number(r.semanas_con_descuento) * Number(r.descuento))
        }
      });
    }

    if (type === 'anticipo') {
      const rows = await query(`
        SELECT
          a.id_anticipo, a.monto, a.estado, a.fecha_crea,
          CONCAT(solicitante.nombre, ' ', solicitante.apellido) as solicitante_nombre,
          solicitante.nick as solicitante_nick
        FROM anticipos a
        LEFT JOIN usuarios solicitante ON a.usuario_id = solicitante.id_usuario
        WHERE a.id_anticipo = ?
      `, [id]) as any[];
      
      if (!rows.length) return res.status(200).json({ success: true, data: null });
      
      return res.status(200).json({
        success: true,
        data: {
          ...rows[0],
          tipo: 'anticipo'
        }
      });
    }
    
    if (type === 'venta' || type === 'comision' || type === 'propina') {
      // Resolve venta_id
      let ventaId: any = null;

      if (type === 'venta') {
        ventaId = id;
      } else if (type === 'comision') {
        const rows = await query(`
          SELECT COALESCE(c.venta_id, c.servicio_id) as venta_id, 
                 CASE WHEN c.venta_id IS NOT NULL THEN 'venta' ELSE 'servicio' END as source_type
          FROM detalle_comisiones dc
          INNER JOIN comisiones c ON c.id_comision = dc.comision_id
          WHERE dc.id_detalle_comision = ?
        `, [id]) as any[];
        ventaId = rows[0]?.venta_id ?? null;
        const sourceType = rows[0]?.source_type;
        
        if (sourceType === 'servicio') {
          // Handle servicio comision
          const servicioId = ventaId;
          if (!servicioId) return res.status(200).json({ success: true, data: null });
          
          const [servicios, usuarios, comisiones] = await Promise.all([
            query(`
              SELECT
                s.id_servicio, s.codigo, s.total, s.tiempo, s.estado, s.fecha_crea,
                s.precio_servicio, s.precio_habitacion,
                COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as cliente_nombre,
                h.nombre as habitacion_nombre,
                CONCAT(creator.nombre, ' ', creator.apellido) as cajero_nombre, creator.nick as cajero_nick
              FROM servicios s
              LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
              LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
              LEFT JOIN usuarios creator ON s.created_by = creator.id_usuario
              WHERE s.id_servicio = ?
            `, [servicioId]),
            query(`
              SELECT CONCAT(u.nombre, ' ', u.apellido) as nombre, u.nick
              FROM detalle_servicios ds
              LEFT JOIN usuarios u ON ds.usuario_id = u.id_usuario
              WHERE ds.servicio_id = ?
            `, [servicioId]),
            query(`
              SELECT dc.comision, CONCAT(u.nombre, ' ', u.apellido) as nombre, u.nick
              FROM comisiones c
              INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
              LEFT JOIN usuarios u ON dc.usuario_id = u.id_usuario
              WHERE c.servicio_id = ?
            `, [servicioId])
          ]) as any[][];
          
          if (!servicios.length) return res.status(200).json({ success: true, data: null });
          
          return res.status(200).json({
            success: true,
            data: {
              ...servicios[0],
              tipo: 'servicio',
              anfitrionas: usuarios.map((u: any, i: number) => ({
                ...u,
                comision: comisiones[i]?.comision || 0
              })),
              detalles: [],
              propinas_detalle: []
            }
          });
        }
      } else if (type === 'propina') {
        const rows = await query(`
          SELECT COALESCE(p.venta_id, NULL) as venta_id
          FROM detalle_propinas dp
          INNER JOIN propinas p ON p.id_propina = dp.propina_id
          WHERE dp.id_detalle_propina = ?
        `, [id]) as any[];
        ventaId = rows[0]?.venta_id ?? null;
      }

      if (!ventaId) return res.status(200).json({ success: true, data: null });

      const [ventas, detalles, usuarios, propinas] = await Promise.all([
        query(`
          SELECT
            v.id_venta, v.codigo, v.total, v.propina, v.estado, v.fecha_crea, v.tiempo,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as cliente_nombre,
            h.nombre as habitacion_nombre,
            CONCAT(ca.nombre, ' ', ca.apellido) as cajero_nombre, ca.nick as cajero_nick,
            CASE WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, ' ', g.apellido) ELSE NULL END as garzon_nombre,
            CASE WHEN v.pedido_id IS NOT NULL THEN g.nick ELSE NULL END as garzon_nick
          FROM ventas v
          LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
          LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
          LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
          LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
          LEFT JOIN usuarios ca ON v.created_by = ca.id_usuario
          WHERE v.id_venta = ?
        `, [ventaId]),
        query(`
          SELECT dv.cantidad, dv.precio, (dv.cantidad * dv.precio) as subtotal, pr.nombre as producto_nombre
          FROM detalle_ventas dv
          LEFT JOIN productos pr ON dv.producto_id = pr.id_producto
          WHERE dv.venta_id = ?
        `, [ventaId]),
        query(`
          SELECT CONCAT(u.nombre, ' ', u.apellido) as nombre, u.nick
          FROM ventas_usuarios vu
          LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario
          WHERE vu.venta_id = ?
        `, [ventaId]),
        query(`
          SELECT dp.monto, CONCAT(u.nombre, ' ', u.apellido) as nombre, u.nick
          FROM propinas pr
          INNER JOIN detalle_propinas dp ON dp.propina_id = pr.id_propina
          LEFT JOIN usuarios u ON dp.usuario_id = u.id_usuario
          WHERE pr.venta_id = ?
        `, [ventaId]),
      ]) as any[][];

      if (!ventas.length) return res.status(200).json({ success: true, data: null });

      return res.status(200).json({
        success: true,
        data: {
          ...ventas[0],
          tipo: 'venta',
          detalles,
          anfitrionas: usuarios,
          propinas_detalle: propinas,
        }
      });
    }

    return res.status(200).json({ success: true, data: null });
  } catch (error) {
    console.error('Error in /api/events/detail:', error);
    return res.status(500).json({ success: false, message: 'Error interno', error: error instanceof Error ? error.message : String(error) });
  }
}

export default withAuth(handler);

