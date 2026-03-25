import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const dbCheck = await query('SELECT 1 as health_check');
    return NextResponse.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: { status: 'connected', response: dbCheck },
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        },
        message: 'API funcionando correctamente'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: { status: 'unhealthy', error: error.message }, message: 'API no disponible' }, { status: 503 });
  }
}
