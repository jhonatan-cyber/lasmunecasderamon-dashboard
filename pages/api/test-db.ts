import type { NextApiRequest, NextApiResponse } from 'next';
import { testConnection, query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Probar conexión a la base de datos
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo conectar a la base de datos',
        error: 'Database connection failed'
      });
    }

    // Probar una consulta simple
    const result = await query('SELECT 1 as test');
    
    return res.status(200).json({
      success: true,
      message: 'Conexión a la base de datos exitosa',
      data: result,
      env: {
        DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
        DB_USER: process.env.DB_USER ? 'Set' : 'Not set',
        DB_NAME: process.env.DB_NAME ? 'Set' : 'Not set',
        DB_PORT: process.env.DB_PORT ? 'Set' : 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      }
    });
  } catch (error) {
    console.error('Error en test-db:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
