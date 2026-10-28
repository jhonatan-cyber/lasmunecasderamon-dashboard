import { createStaffSseResponse } from '@/lib/api/staffSseStream';

export const dynamic = 'force-dynamic';

/**
 * Stream de eventos del personal. Exige sesión: el rol y el id del usuario se usan para
 * decidir qué eventos le llegan (ver `lib/api/sseEvents.ts`).
 */
export async function GET(request: Request) {
  return createStaffSseResponse(request);
}
