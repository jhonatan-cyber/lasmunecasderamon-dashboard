import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { ServiceService } from '@/lib/services/ServiceService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    all: searchParams.get('all') || undefined,
    estado: searchParams.get('estado') || undefined,
    caja_id: searchParams.get('caja_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    page: searchParams.get('page') || undefined
  };
  const data = await ServiceRepository.getAll(params);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request, { user }) => {
  const body = await request.json();
  const result = await ServiceService.createService(body, user.id.toString());
  sendNotificationToAll('service_changed', {
    action: 'create',
    id: result.id,
    timestamp: new Date().toISOString()
  });
  return NextResponse.json({ success: true, ...result });
});
