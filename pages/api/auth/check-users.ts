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
    console.log('🔍 [CHECK-USERS] Iniciando verificación de usuarios...');
    
    // Verificar conexión a la base de datos
    console.log('🔍 [CHECK-USERS] Probando conexión a la base de datos...');
    const connectionTest = await query('SELECT 1 as test') as any[];
    
    if (!connectionTest || connectionTest.length === 0) {
      console.error('❌ [CHECK-USERS] No se pudo conectar a la base de datos');
      return res.status(500).json({
        success: false,
        message: 'Error de conexión a la base de datos',
        error: 'No se pudo establecer conexión con la base de datos'
      });
    }
    
    console.log('✅ [CHECK-USERS] Conexión a la base de datos exitosa');
    
    // Verificar si hay usuarios registrados
    console.log('🔍 [CHECK-USERS] Consultando usuarios en la base de datos...');
    const users = await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1') as any[];
    
    const userCount = users[0]?.count || 0;
    const hasUsers = userCount > 0;

    console.log(`✅ [CHECK-USERS] Usuarios encontrados: ${userCount}, hasUsers: ${hasUsers}`);

    return res.status(200).json({
      success: true,
      hasUsers,
      userCount,
      dbConnected: true
    });
  } catch (error) {
    console.error('❌ [CHECK-USERS] Error en verificación:', error);
    console.error('❌ [CHECK-USERS] Detalles del error:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
      errorCode: (error as any)?.code,
      dbConnected: false
    });
  }
}
