import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const GET = withAppApiWrapper(async () => {
  // Contar solicitudes de servicios pendientes (estado = 0)
  const serviciosCount = await ServiceRequestRepository.getPendingCount();

  // Contar pedidos pendientes (estado IN 1, 2)
  const pedidosResult = await query<any[]>(
    'SELECT COUNT(*) as count FROM pedidos WHERE estado IN (1, 2)'
  );
  const pedidosCount = pedidosResult[0]?.count || 0;

  // Total = servicios + pedidos
  const totalCount = serviciosCount + pedidosCount;

  logger.debug('[pending-count] Totals calculated', { serviciosCount, pedidosCount, totalCount });

  return NextResponse.json({
    success: true,
    count: totalCount,
    serviciosCount,
    pedidosCount
  });
});
