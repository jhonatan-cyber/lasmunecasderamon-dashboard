import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Obtener las últimas 20 notificaciones de pedidos
      const results = await query(
        `
        SELECT 
          p.id_pedido,
          p.codigo,
          c.nombre as cliente_nombre,
          c.apellido as cliente_apellido,
          u.nombre as mesero_nombre,
          p.total,
          p.fecha_crea as timestamp
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id_cliente
        LEFT JOIN usuarios u ON p.mesero_id = u.id_usuario
        WHERE p.estado = 1
        ORDER BY p.fecha_crea DESC
        LIMIT 20
      `,
        []
      );

      const notifications = (results as any[]).map((row: any) => ({
        id: row.id_pedido,
        codigo: row.codigo,
        cliente: `${row.cliente_nombre || ''} ${row.cliente_apellido || ''}`.trim() || 'Cliente',
        mesero: row.mesero_nombre || 'Mesero',
        total: row.total,
        timestamp: row.timestamp
      }));

      return res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial de notificaciones'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}
