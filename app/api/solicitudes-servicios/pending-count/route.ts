import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ServiceRequestService } from '@/lib/services/ServiceRequestService';
import { contarPedidosPendientes } from '@/modules/operacion';
import { logger } from '@/lib/utils/logger';

export const GET = withPublicRoute(async () => {
  const serviciosCount = await ServiceRequestService.getPendingCount();

  const pedidosCount = await contarPedidosPendientes();

  const totalCount = serviciosCount + pedidosCount;

  logger.debug('[pending-count] Totals calculated', { serviciosCount, pedidosCount, totalCount });

  return NextResponse.json({
    success: true,
    data: {
      count: totalCount,
      serviciosCount,
      pedidosCount
    }
  });
});
