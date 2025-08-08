import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Test connection handler started');
  
  if (req.method !== 'GET') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('✅ Method validation passed');

  try {
    // Configuración de conexión directa
    const config = {
      host: process.env.DB_HOST || 'lasmunecasderamoncom-lasmunecasderamondb-jfteo0',
      user: process.env.DB_USER || 'nuwe',
      password: process.env.DB_PASSWORD || '***REMOVED***',
      database: process.env.DB_NAME || 'lasmunecasderamon',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    };

    console.log('🔍 Testing connection with config:', {
      host: config.host,
      user: config.user,
      database: config.database,
      port: config.port,
      passwordSet: !!config.password
    });

    console.log('📡 Attempting to create direct connection...');
    // Crear conexión directa
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection created successfully');
    console.log('📊 Connection details:', {
      threadId: connection.threadId
    });

    console.log('📡 Attempting to execute test query...');
    // Probar consulta simple
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query executed successfully:', rows);

    console.log('📡 Attempting to execute users count query...');
    // Probar consulta a la tabla usuarios
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM usuarios');
    console.log('✅ Users count query executed:', users);

    console.log('📡 Attempting to close connection...');
    // Cerrar conexión
    await connection.end();
    console.log('✅ Connection closed successfully');

    console.log('🎉 All database operations completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa',
      data: {
        test: rows,
        usersCount: users
      },
      config: {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port
      }
    });

  } catch (error) {
    console.error('❌ Connection test error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return res.status(500).json({
      success: false,
      message: 'Error de conexión',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
