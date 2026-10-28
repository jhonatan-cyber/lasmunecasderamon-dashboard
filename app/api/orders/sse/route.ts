import { createStaffSseResponse } from '@/lib/api/staffSseStream';

export const dynamic = 'force-dynamic';

/**
 * Segundo stream del personal (lo consume `hooks/orders/useOrdersSSE`). Comparte el manager
 * y por lo tanto la misma política de audiencia que `/api/notifications/sse`.
 */
export async function GET(request: Request) {
  return createStaffSseResponse(request);
}
