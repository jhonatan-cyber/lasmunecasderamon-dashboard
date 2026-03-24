/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Obtener usuario autenticado
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  if (req.method === 'GET') {
    try {
    
      const cajaResult = (await query(
        'SELECT id_caja, usuario_id_apertura, fecha_apertura FROM cajas WHERE estado = 1 LIMIT 1'
      )) as any[];

      const hasOpenCaja = cajaResult.length > 0;
      const cajaInfo = hasOpenCaja ? cajaResult[0] : null;



      return res.status(200).json({
        success: true,
        data: {
          hasOpenCaja,
          cajaInfo: cajaInfo
            ? {
                id_caja: cajaInfo.id_caja,
                usuario_id_apertura: cajaInfo.usuario_id_apertura,
                fecha_apertura: cajaInfo.fecha_apertura
              }
            : null
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estado de caja',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);

