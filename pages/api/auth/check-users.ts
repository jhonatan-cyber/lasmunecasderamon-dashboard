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
    // Verificar conexión a la base de datos

    
    // Hacer una consulta simple para verificar la conexión
    const connectionTest = await query('SELECT 1 as test') as any[];
    
    if (!connectionTest || connectionTest.length === 0) {

      return res.status(500).json({
        success: false,
        message: 'Error de conexión a la base de datos',
        error: 'No se pudo establecer conexión con la base de datos'
      });
    }
    
    
    
    // Verificar si hay usuarios registrados
    const users = await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1') as any[];
    
    const userCount = users[0]?.count || 0;
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
      dbConnected: false
    });
  }
}
