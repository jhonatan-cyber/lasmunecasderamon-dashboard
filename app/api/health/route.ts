import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const GET = withAppApiWrapper(async () => {
  const dbCheck = await query('SELECT 1 as health_check');
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: getNowInBusinessTimezone(),
      uptime: process.uptime(),
      database: { status: 'connected', response: dbCheck },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    },
    message: 'API funcionando correctamente'
  });
});
