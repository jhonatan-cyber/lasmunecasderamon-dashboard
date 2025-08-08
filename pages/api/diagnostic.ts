import type { NextApiRequest, NextApiResponse } from 'next';
import { testConnection, query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'Not set',
        DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
        DB_USER: process.env.DB_USER ? 'Set' : 'Not set',
        DB_NAME: process.env.DB_NAME ? 'Set' : 'Not set',
        DB_PORT: process.env.DB_PORT ? 'Set' : 'Not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
      },
      database: {
        connection: false,
        error: null as string | null,
        query: null as string | null
      },
      dependencies: {
        bcryptjs: typeof require('bcryptjs') !== 'undefined',
        jsonwebtoken: typeof require('jsonwebtoken') !== 'undefined',
        mysql2: typeof require('mysql2') !== 'undefined',
        cookies: typeof require('cookies') !== 'undefined'
      }
    };

    // Probar conexión a la base de datos
    try {
      const isConnected = await testConnection();
      diagnostic.database.connection = isConnected;
      
      if (isConnected) {
        // Probar una consulta simple
        const result = await query('SELECT 1 as test');
        diagnostic.database.query = 'Success';
      }
    } catch (dbError) {
      diagnostic.database.error = dbError instanceof Error ? dbError.message : 'Unknown error';
    }

    return res.status(200).json({
      success: true,
      diagnostic
    });
  } catch (error) {
    console.error('Error en diagnostic:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
