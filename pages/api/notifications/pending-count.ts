import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Contar pedidos de productos pendientes (estado = 1)
    const pedidosResult = await query(
      'SELECT COUNT(*) as count FROM pedidos WHERE estado = ?',
      [1]
    );
    const pedidosCount =
      Array.isArray(pedidosResult) && pedidosResult.length > 0
        ? Number((pedidosResult[0] as { count?: number | string }).count || 0)
        : 0;

    // Contar solicitudes de servicio pendientes (estado = 'pendiente')
    const solicitudesResult = await query(
      'SELECT COUNT(*) as count FROM solicitudes_servicios WHERE estado = ?',
      ['pendiente']
    );
    const solicitudesCount =
      Array.isArray(solicitudesResult) && solicitudesResult.length > 0
        ? Number((solicitudesResult[0] as { count?: number | string }).count || 0)
        : 0;

    const totalCount = pedidosCount + solicitudesCount;

    return res.status(200).json({
      success: true,
      pedidosCount: pedidosCount,
      solicitudesCount: solicitudesCount,
      totalCount: totalCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener conteos de notificaciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default handler;

