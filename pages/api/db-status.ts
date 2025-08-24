import type { NextApiRequest, NextApiResponse } from 'next';
import { testConnection } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('🔍 [DB-STATUS] Verificando estado de la base de datos...');
  
  try {
    // Verificar variables de entorno
    const envVars = {
      DB_HOST: process.env.DB_HOST || 'NOT_SET',
      DB_USER: process.env.DB_USER || 'NOT_SET',
      DB_NAME: process.env.DB_NAME || 'NOT_SET',
      DB_PORT: process.env.DB_PORT || 'NOT_SET',
      DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT_SET'
    };

    console.log('📋 [DB-STATUS] Variables de entorno:');
    console.log('   DB_HOST:', envVars.DB_HOST);
    console.log('   DB_USER:', envVars.DB_USER);
    console.log('   DB_NAME:', envVars.DB_NAME);
    console.log('   DB_PORT:', envVars.DB_PORT);
    console.log('   DB_PASSWORD:', envVars.DB_PASSWORD);

    // Probar conexión
    const isConnected = await testConnection();

    const status = {
      timestamp: new Date().toISOString(),
      connected: isConnected,
      environment: envVars,
      message: isConnected ? 'Conexión exitosa' : 'Error de conexión'
    };

    console.log('📊 [DB-STATUS] Resultado:', status);

    return res.status(200).json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('❌ [DB-STATUS] Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
