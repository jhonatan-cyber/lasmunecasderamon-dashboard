import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    console.log('[PENDING-COUNT] Obteniendo count de solicitudes pendientes...');
    
    const result = await query(
      'SELECT COUNT(*) as count FROM solicitudes_servicios WHERE estado = ?',
      ['pendiente']
    );

    const count = Array.isArray(result) && result.length > 0 
      ? (result[0] as any).count 
      : 0;

    console.log('[PENDING-COUNT] Count obtenido:', count);

    return res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('[PENDING-COUNT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener count de solicitudes pendientes',
      error
    });
  }
}

export default withAuth(handler);
