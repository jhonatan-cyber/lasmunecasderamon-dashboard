import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Verificar conexión a la base de datos
    const dbCheck = await query('SELECT 1 as health_check');
    
    // Información del sistema
    const systemInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: (() => {
        try {
          const pkgPath = path.resolve(process.cwd(), 'package.json');
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return pkg.version || '1.0.0';
        } catch (_) {
          return process.env.npm_package_version || '1.0.0';
        }
      })(),
      database: {
        status: 'connected',
        response: dbCheck
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      services: {
        database: 'operational',
        api: 'operational',
        authentication: 'operational'
      }
    };

    // Configurar headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.status(200).json({
      success: true,
      data: systemInfo,
      message: 'API funcionando correctamente'
    });
  } catch (error) {
    console.error('Error en health check:', error);
    
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      },
      message: 'API no disponible'
    });
  }
}
