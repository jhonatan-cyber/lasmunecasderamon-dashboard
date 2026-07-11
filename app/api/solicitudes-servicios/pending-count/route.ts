import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRequestService } from '@/lib/services/ServiceRequestService';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const GET = withAppApiWrapper(async () => {
  const serviciosCount = await ServiceRequestService.getPendingCount();

  const pedidosResult = await query<any[]>(
    'SELECT COUNT(*) as count FROM pedidos WHERE estado IN (1, 2)'
  );
  const pedidosCount = pedidosResult[0]?.count || 0;

  const totalCount = serviciosCount + pedidosCount;

  logger.debug('[pending-count] Totals calculated', { serviciosCount, pedidosCount, totalCount });

  return NextResponse.json({
    success: true,
    count: totalCount,
    serviciosCount,
    pedidosCount
  });
});
