import { withPublicRoute } from '@/lib/api';
import { ApiResponse } from '@/lib/api';
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const GET = withPublicRoute(async () => {
  const dbCheck = await query('SELECT 1 as health_check');
  return ApiResponse.success(
    {
      status: 'healthy',
      timestamp: getNowInBusinessTimezone(),
      uptime: process.uptime(),
      database: { status: 'connected', response: dbCheck },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    },
    'API funcionando correctamente'
  );
});
