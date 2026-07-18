import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ServiceService } from '@/lib/services/ServiceService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { ServiceCreateSchema } from '@/lib/business/schemas/service';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    all: searchParams.get('all') || undefined,
    estado: searchParams.get('estado') || undefined,
    caja_id: searchParams.get('caja_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    page: searchParams.get('page') || undefined
  };
  const data = await ServiceService.getAll(params);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute({ auth: true, audit: true }, async (request: Request, { user }) => {
  const body = await request.json();
  const validated = validateOrResponse(ServiceCreateSchema, body);
  if (validated instanceof NextResponse) return validated;
  const result = await ServiceService.createService(validated, user.id.toString());
  sendNotificationToAll('service_changed', {
    action: 'create',
    id: result.id,
    timestamp: new Date().toISOString()
  });
  return NextResponse.json({ success: true, ...result });
});
