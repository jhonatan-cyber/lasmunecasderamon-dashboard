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
    // Verificar si hay usuarios registrados
    const users = await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1') as any[];
    
    const userCount = users[0]?.count || 0;
    const hasUsers = userCount > 0;

    return res.status(200).json({
      success: true,
      hasUsers,
      userCount
    });
  } catch (error) {
    console.error('Error verificando usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
