import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    const connectionTest = (await query('SELECT 1 as test')) as Array<{ test?: number }>;

    if (!connectionTest || connectionTest.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error de conexión a la base de datos',
        error: 'No se pudo establecer conexión con la base de datos'
      });
    }

    const users = (await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1')) as Array<{ count?: number | string }>;

    const userCount = Number(users[0]?.count || 0);
    const hasUsers = userCount > 0;

    return res.status(200).json({
      success: true,
      hasUsers,
      userCount,
      dbConnected: true
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
      errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      dbConnected: false
    });
  }
}

