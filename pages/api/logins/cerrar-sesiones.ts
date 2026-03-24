import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  try {
    // Eliminar todas las sesiones activas
    const result = await query('DELETE FROM logins WHERE estado = 1') as { affectedRows?: number };

    return res.status(200).json({
      success: true,
      message: 'Todas las sesiones han sido cerradas exitosamente',
      data: { sesionesCerradas: result.affectedRows || 0 }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default withAuth(handler);

