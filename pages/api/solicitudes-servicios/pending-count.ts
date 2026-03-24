/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  try {

    // Count from solicitudes_servicios
    let solicitudesCount = 0;
    try {
      const resultSolicitudes = await query(
        'SELECT COUNT(*) as count FROM solicitudes_servicios WHERE estado = ?',
        ['pendiente']
      );
      solicitudesCount = Array.isArray(resultSolicitudes) && resultSolicitudes.length > 0
        ? (resultSolicitudes[0] as any).count
        : 0;
    } catch (e: any) {
      // Ignore missing table error
    }

    // Count from pedidos
    let pedidosCount = 0;
    try {
      const resultPedidos = await query(
        'SELECT COUNT(*) as count FROM pedidos WHERE estado = 1'
      );
      pedidosCount = Array.isArray(resultPedidos) && resultPedidos.length > 0
        ? (resultPedidos[0] as any).count
        : 0;
    } catch (e: any) {
      // Ignore error
    }

    return res.status(200).json({
      success: true,
      count: Number(solicitudesCount) + Number(pedidosCount),
      solicitudesCount: Number(solicitudesCount),
      pedidosCount: Number(pedidosCount)
    });
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.message?.includes("doesn't exist")) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'Tabla no existe aún.'
      });
    }

    console.error('[PENDING-COUNT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener count de solicitudes pendientes',
      error: error?.message || String(error)
    });
  }
}

export default withAuth(handler);

